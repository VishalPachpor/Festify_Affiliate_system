import { Card } from "@/components/ui/card";

type AuthHeaderProps = {
  title: string;
  subtitle?: string;
};

export function AuthHeader({ title, subtitle }: AuthHeaderProps) {
  return (
    <div className="flex flex-col gap-[var(--space-xs)]">
      <Card.Title className="text-xl text-center">{title}</Card.Title>
      {subtitle && (
        <Card.Description className="text-center">
          {subtitle}
        </Card.Description>
      )}
    </div>
  );
}
