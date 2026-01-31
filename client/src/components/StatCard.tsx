import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  className?: string;
  color?: "default" | "primary" | "success" | "warning" | "destructive";
}

export function StatCard({ label, value, icon: Icon, trend, className, color = "default" }: StatCardProps) {
  const colorStyles = {
    default: "text-muted-foreground bg-secondary/50",
    primary: "text-primary bg-primary/10 border-primary/20",
    success: "text-green-500 bg-green-500/10 border-green-500/20",
    warning: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20",
    destructive: "text-red-500 bg-red-500/10 border-red-500/20",
  };

  return (
    <Card className={cn("border-border/50 shadow-lg bg-card/50 backdrop-blur-sm transition-all hover:border-border", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <h3 className="text-2xl font-bold mt-2 font-display">{value}</h3>
            {trend && <p className="text-xs text-muted-foreground mt-1">{trend}</p>}
          </div>
          <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center border transition-colors", colorStyles[color])}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
