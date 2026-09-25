// Moved to `@/lib/input/keyboardTarget`: the gate is pure and the elektro
// neuron viewport needs the same one. Re-exported so the scene's imports keep
// their historical path.
export { isSceneNavigationTarget, isTypingTarget } from "@/core/dnd/keyboardTarget";
