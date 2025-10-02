import { AnimatedBeamDemo } from "./circle";
import { Ripple } from "./ripple";



const InsightsFeatures = () => {
  return (
    <section className="py-16 font-devis">
      <div className="container flex flex-col gap-16 lg:px-16">
        <div className="grid gap-6 md:grid-cols-2 lg:gap-8">
          <div className="flex flex-col overflow-clip rounded-xl border border-border md:col-span-2 md:grid md:grid-cols-2 md:gap-6 lg:gap-8">
            <div className="md:min-h-[24rem] lg:min-h-[28rem] xl:min-h-[32rem] relative">
              <div className="aspect-16/9 h-full w-full overflow-hidden">
                <Ripple />
              </div>
            </div>
          <div className="flex flex-col justify-center px-6 py-8 md:px-8 md:py-10 lg:px-10 lg:py-12 bg-[#e5e5e5]/5">
              <h3 className="mb-3 text-lg font-semibold md:mb-4 md:text-2xl lg:mb-6 text-[#e5e5e5]">
                1_1. Collaboration
              </h3>
              <p className="text-muted-foreground/70 lg:text-lg">
                Sync decisions instantly-teams share context, approvals, and
                next steps without leaving the flow.
              </p>
            </div>
          </div>
          <div className="flex flex-col-reverse overflow-clip rounded-xl border border-border md:col-span-2 md:grid md:grid-cols-2 md:gap-6 lg:gap-8">
            <div className="flex flex-col justify-center px-6 py-8 md:px-8 md:py-10 lg:px-10 lg:py-12 bg-[#e5e5e5]/5">
              <h3 className="mb-3 text-lg font-semibold md:mb-4 md:text-2xl lg:mb-6 text-[#e5e5e5]">
                1_2. Integration
              </h3>
              <p className="text-muted-foreground/70 lg:text-lg">
                Link your knowledge stack to surface smarter insights and spot
                blockers before they disrupt delivery.
              </p>
            </div>
            <div className="md:min-h-[24rem] lg:min-h-[28rem] xl:min-h-[32rem] flex items-center justify-center relative">
              <AnimatedBeamDemo />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export { InsightsFeatures };
