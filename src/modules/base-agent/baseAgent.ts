import { EventEmitter } from "events";
import { createOpenAIHelper } from "../handlers/open-ai";

// To be moved to core
export type AgentState = "initializing" | "idle" | "busy" | "error" | "active";
export interface PluginApi {
  emit: (event: string, ...args: any[]) => void;
  on: (event: string, listener: (...args: any[]) => void) => void;
  off: (event: string, listener: (...args: any[]) => void) => void;
  performAction: (
    pluginName: string,
    action: string,
    ...args: any[]
  ) => Promise<any>;
}
type Task = {
  id: string;
  execute: () => Promise<void>;
};
interface Agent {
  id: string;
  status: AgentState;
}

interface Plugin {
  [action: string]: (...args: any[]) => any;
}
interface Logger {
  log: (message: string) => void;
}
const createLogger = (log: boolean): Logger => {
  return {
    log: (message: string) => {
      const timestamp = new Date().toISOString();
      if (log) {
        console.log(`${timestamp} - ${message}`);
      } else {
        return;
      }
    },
  };
};
export const createBaseAgent = (useOpenAI = false, log = false) => {
  const eventEmitter = new EventEmitter();
  const logger = createLogger(log);
  let plugins: Record<string, Plugin> = {};
  let taskQueue: Task[] = [];
  let agentState: AgentState = "initializing";
  const agentRegistry = new Map<string, Agent>();
  let openai;

  if (useOpenAI) {
    openai = createOpenAIHelper();
  }

  const use = (
    pluginName: string,
    pluginFactory: (api: PluginApi) => Plugin
  ) => {
    if (plugins[pluginName]) {
      throw new Error(`Plugin ${pluginName} is already registered.`);
    }
    const pluginApi: PluginApi = {
      emit: (event, ...args) => eventEmitter.emit(event, ...args),
      on: (event, listener) => eventEmitter.on(event, listener),
      off: (event, listener) => eventEmitter.off(event, listener),
      performAction: (pluginName, action, ...args) =>
        performAction(pluginName, action, ...args),
    };
    plugins[pluginName] = pluginFactory(pluginApi);
  };

  const performAction = async (
    pluginName: string,
    action: string,
    ...args: any[]
  ): Promise<any> => {
    if (
      plugins[pluginName] &&
      typeof plugins[pluginName][action] === "function"
    ) {
      return plugins[pluginName][action](...args);
    } else {
      throw new Error(`Plugin ${pluginName} does not support action ${action}`);
    }
  };
  const transitionState = (newState: AgentState) => {
    agentState = newState;
    eventEmitter.emit("stateChanged", newState);
  };

  eventEmitter.on("stateChanging", (newState: AgentState) => {
    transitionState(newState);
  });

  eventEmitter.on("stateChanged", (newState: AgentState) => {
    logger.log(`Agent state changed to: ${newState}`);
  });

  const enqueueTask = (task: Task) => {
    taskQueue.push(task);
    eventEmitter.emit("taskQueued", task);
  };

  const dequeueTask = (): Task | undefined => {
    return taskQueue.shift();
  };

  const registerAgent = (agent: Agent) => {
    agentRegistry.set(agent.id, agent);
    eventEmitter.emit("agentRegistered", agent);
  };

  const updateAgentStatus = (agentId: string, status: AgentState) => {
    let agent = agentRegistry.get(agentId);
    if (agent) {
      agent.status = status;
      eventEmitter.emit("agentStatusUpdated", agentId, status);
    }
  };

  const executeTask = async (): Promise<void> => {
    if (agentState !== "active") {
      throw new Error("Agent is not active and cannot execute tasks.");
    }
    const task = dequeueTask();
    if (task) {
      await task.execute();
      eventEmitter.emit("taskExecuted", task);
    }
  };

  transitionState("idle");

  return {
    use,
    performAction,
    on: eventEmitter.on.bind(eventEmitter),
    off: eventEmitter.off.bind(eventEmitter),
    transitionState,
    enqueueTask,
    dequeueTask,
    registerAgent,
    updateAgentStatus,
    executeTask,
    openai,
  };
};
