export const StatusPulse = (props: { color: string }) => {
  return (
    <span className="my-auto ml-1 flex h-3 w-3">
      <span
        className={`group-hover:animate-ping absolute inline-flex h-3 w-3 rounded-full bg-${props.color} opacity-75`}
      ></span>
      <span
        className={`relative inline-flex rounded-full h-3 w-3 bg-${props.color}`}
      ></span>
    </span>
  );
};
