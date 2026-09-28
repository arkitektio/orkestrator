export const Explainer = (props: { title: string; description: string }) => {
  return (
    <div className="col-span-4 grid md:grid-cols-2 gap-4 md:gap-8 xl:gap-20 md:items-center mb-3">
      <div>
        <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
          {props.title}
        </h1>
        <p className="mt-3 text-xl text-muted-foreground">
          {props.description}
        </p>
      </div>
    </div>
  );
};
