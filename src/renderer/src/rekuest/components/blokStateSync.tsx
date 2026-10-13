import * as React from 'react';
import {useBlokRuntime} from '@/core/blok/renderer/runtime';
import {useBoundState} from '@/rekuest/travel/context';

/**
 * Writes one state of one bound agent into the blok's runtime, under
 * `<dependency>/<interface>`. The same component whether the state is watched
 * live or read from the past, so switching between the two never clears the
 * path in between.
 */
export const BlokStateSync = (props: {
  dependencyKey: string;
  stateInterface: string;
  agentId: string;
}) => {
  const {agentId, dependencyKey, stateInterface} = props;
  const {value, revision, known} = useBoundState({agentID: agentId, stateInterface});
  const setRuntimeValue = useBlokRuntime(state => state.setRuntimeValue);
  const clearRuntimeValue = useBlokRuntime(state => state.clearRuntimeValue);
  const setAgentMappingStateUpdate = useBlokRuntime(state => state.setAgentMappingStateUpdate);
  const clearAgentMappingStateUpdate = useBlokRuntime(state => state.clearAgentMappingStateUpdate);
  const runtimePath = `${dependencyKey}/${stateInterface}`;

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
      clearRuntimeValue(runtimePath);
      clearAgentMappingStateUpdate(dependencyKey, stateInterface);
    },
    [agentId, clearAgentMappingStateUpdate, clearRuntimeValue, dependencyKey, runtimePath, stateInterface],
  );

  return null;
};
