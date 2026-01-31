import { Layout } from "@/components/Layout";
import { StatCard } from "@/components/StatCard";
import { useStats } from "@/hooks/use-stats";
import { useLogs } from "@/hooks/use-logs";
import { 
  Activity, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Terminal 
} from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useStats();
  const { data: logs, isLoading: logsLoading } = useLogs();

  const recentLogs = logs?.slice(0, 5) || [];

  return (
    <Layout>
      <div className="flex flex-col gap-8">
        <div>
          <h2 className="text-3xl font-display font-bold text-white mb-2">System Overview</h2>
          <p className="text-muted-foreground">Real-time metrics for automated video pipeline.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statsLoading ? (
            Array(4).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-xl bg-card/50" />
            ))
          ) : (
            <>
              <StatCard 
                label="Total Videos" 
                value={stats?.totalVideos || 0} 
                icon={Activity}
                color="primary"
              />
              <StatCard 
                label="Published" 
                value={stats?.publishedVideos || 0} 
                icon={CheckCircle2} 
                color="success"
              />
              <StatCard 
                label="Pending" 
                value={stats?.pendingVideos || 0} 
                icon={Clock} 
                color="warning"
              />
              <StatCard 
                label="Failed" 
                value={stats?.failedVideos || 0} 
                icon={XCircle} 
                color="destructive"
              />
            </>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-card/50 border border-border/50 rounded-2xl p-6 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-6">
            <Terminal className="h-5 w-5 text-primary" />
            <h3 className="text-xl font-display font-bold">Recent System Logs</h3>
          </div>

          <div className="space-y-4">
            {logsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : recentLogs.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No logs available.</p>
            ) : (
              recentLogs.map((log, i) => (
                <motion.div 
                  key={log.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-start gap-4 p-4 rounded-lg bg-black/20 border border-white/5 hover:bg-black/30 transition-colors"
                >
                  <div className={`mt-1 h-2 w-2 rounded-full ${
                    log.level === 'error' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 
                    log.level === 'warn' ? 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]' : 
                    'bg-primary shadow-[0_0_8px_rgba(124,58,237,0.5)]'
                  }`} />
                  <div className="flex-1 font-mono text-sm">
                    <div className="flex justify-between items-center mb-1">
                      <span className={`font-bold uppercase text-xs tracking-wider ${
                        log.level === 'error' ? 'text-red-400' : 
                        log.level === 'warn' ? 'text-yellow-400' : 
                        'text-primary'
                      }`}>
                        [{log.agent}]
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {log.timestamp && format(new Date(log.timestamp), "HH:mm:ss")}
                      </span>
                    </div>
                    <p className="text-foreground/90">{log.message}</p>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
