
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type StatCardProps = {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: string | number;
    positive: boolean;
  };
  className?: string;
  valueClassName?: string;
  isLoading?: boolean;
  description?: string;
};

export function StatCard({
  title,
  value,
  icon,
  trend,
  className,
  valueClassName,
  isLoading = false,
  description,
}: StatCardProps) {
  return (
    <Card className={cn("overflow-hidden", className)} title={description}>
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            {isLoading ? (
              <Skeleton className="h-8 w-20 mt-1" />
            ) : (
              <h3 className={cn("text-2xl font-bold mt-1", valueClassName)}>
                {value}
              </h3>
            )}
            {trend && !isLoading && (
              <p
                className={cn(
                  "text-xs font-medium mt-1 flex items-center",
                  trend.positive ? "text-green-500" : "text-red-500"
                )}
              >
                {trend.positive ? "↑" : "↓"} {trend.value}
              </p>
            )}
          </div>
          <div className="p-2 bg-primary/10 rounded-full">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}
