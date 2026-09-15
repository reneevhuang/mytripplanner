export function PlannerProgress({ currentStep }: { currentStep: number }) {
  const steps = ["Trip basics", "Cities & dates", "Preferences"];
  return (
    <ol className="planner-progress" aria-label={`Step ${currentStep} of ${steps.length}`}>
      {steps.map((label, index) => {
        const step = index + 1;
        return (
          <li className={step === currentStep ? "current" : step < currentStep ? "complete" : ""} key={label}>
            <span>{step < currentStep ? "✓" : step}</span>
            <strong>{label}</strong>
          </li>
        );
      })}
    </ol>
  );
}
