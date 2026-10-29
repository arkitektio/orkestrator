import * as React from 'react';
import {useBlokRuntime} from '@arkitektio/bsx/renderer/runtime/index';
import {useBoundState} from '@/rekuest/travel/context';

/** Where a blok reads one state of the agent bound to a dependency: `deps.<key>.<state>`. */
export const depsStatePath = (dependencyKey: string, stateInterface: string) => `deps.${dependencyKey}.${stateInterface}`;

/**
 * Writes one state of one bound agent into the blok's runtime, under
 * `deps.<dependency>.<interface>`, with its status: pending until it is known,
 * stale while the agent is offline (the last value, flagged). The same
 * component whether the state is watched live or read from the past, so
 * switching between the two never clears the path in between.
 */
export const BlokStateSync = (props: {
  dependencyKey: string;
  stateInterface: string;
  agentId: string;
  /** False while the agent is offline: what it last reported shows, stale. */
  connected?: boolean;
}) => {
  const {agentId, dependencyKey, stateInterface, connected = true} = props;
  const {value, revision, known} = useBoundState({agentID: agentId, stateInterface});
  const setRuntimeValue = useBlokRuntime(state => state.setRuntimeValue);
  const clearRuntimeValue = useBlokRuntime(state => state.clearRuntimeValue);
  const setAgentMappingStateUpdate = useBlokRuntime(state => state.setAgentMappingStateUpdate);
  const clearAgentMappingStateUpdate = useBlokRuntime(state => state.clearAgentMappingStateUpdate);
  const setStatus = useBlokRuntime(state => state.setStatus);
  const runtimePath = depsStatePath(dependencyKey, stateInterface);

  React.useEffect(() => {
    setStatus(runtimePath, {status: !known ? 'pending' : connected ? 'ready' : 'stale'});
  }, [connected, known, runtimePath, setStatus]);

  // Write on every update, clear only when there is known to be nothing (a
  // moment before the state was first recorded) or the binding itself goes
  // away. Clearing between updates would flash the demo state back for a frame.
  React.useEffect(() => {
    if (!known) {
      return;
    }

    if (value == null) {
      clearRuntimeValue(runtimePath);
      clearAgentMappingStateUpdate(dependencyKey, stateInterface);
      return;
    }

    setRuntimeValue(runtimePath, value);
    setAgentMappingStateUpdate(dependencyKey, agentId, stateInterface, value, revision);
  }, [
    agentId,
    clearAgentMappingStateUpdate,
    clearRuntimeValue,
    dependencyKey,
    known,
    revision,
    runtimePath,
    setAgentMappingStateUpdate,
    setRuntimeValue,
    stateInterface,
    value,
  ]);

  React.useEffect(
    () => () => {
      setStatus(runtimePath, null);
      clearRuntimeValue(runtimePath);
      clearAgentMappingStateUpdate(dependencyKey, stateInterface);
    },
    [agentId, clearAgentMappingStateUpdate, clearRuntimeValue, dependencyKey, runtimePath, setStatus, stateInterface],
  );

  return null;
};
