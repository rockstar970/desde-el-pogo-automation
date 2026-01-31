import { Layout } from "@/components/Layout";
import { useLogs } from "@/hooks/use-logs";
import { Terminal, RefreshCw, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

export default function Logs() {
  const { data: logs, isLoading, refetch, isRefetching } = useLogs();
  const [filter, setFilter] = useState<string | null>(null);

  const filteredLogs = filter 
    ? logs?.filter(log => log.level === filter || log.agent === filter)
    : logs;

  const agents = Array.from(new Set(logs?.map(l => l.agent) || []));

  return (
    <Layout>
      <div className="flex flex-col h-[calc(100vh-8rem)]">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-3xl font-display font-bold text-white mb-2">System Logs</h2>
            <p className="text-muted-foreground">Live monitoring of agent activities.</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => refetch()}
              disabled={isRefetching}
              className="border-border hover:bg-secondary"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          <Badge 
            variant={filter === null ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setFilter(null)}
          >
            All
          </Badge>
          <Badge 
            variant={filter === "error" ? "destructive" : "outline"}
            className="cursor-pointer border-red-500/20 text-red-400 hover:bg-red-500/10"
            onClick={() => setFilter(filter === "error" ? null : "error")}
          >
            Errors
          </Badge>
          {agents.map(agent => (
            <Badge
              key={agent}
              variant={filter === agent ? "secondary" : "outline"}
              className="cursor-pointer"
              onClick={() => setFilter(filter === agent ? null : agent)}
            >
              {agent}
            </Badge>
          ))}
        </div>

        {/* Console View */}
        <div className="flex-1 bg-black rounded-xl border border-white/10 shadow-2xl overflow-hidden flex flex-col font-mono text-sm relative">
          <div className="flex items-center px-4 py-2 border-b border-white/10 bg-white/5">
            <Terminal className="h-4 w-4 text-muted-foreground mr-2" />
            <span className="text-xs text-muted-foreground">console output</span>
          </div>
          
          <ScrollArea className="flex-1 p-4">
            {isLoading ? (
              <div className="text-muted-foreground animate-pulse">Loading logs stream...</div>
            ) : filteredLogs?.length === 0 ? (
              <div className="text-muted-foreground">No logs found matching criteria.</div>
            ) : (
              <div className="space-y-1">
                {filteredLogs?.map((log) => (
                  <div key={log.id} className="flex gap-3 hover:bg-white/5 px-2 py-0.5 rounded transition-colors group">
                    <span className="text-muted-foreground/50 shrink-0 select-none w-20">
                      {log.timestamp && format(new Date(log.timestamp), "HH:mm:ss")}
                    </span>
                    <span className={`shrink-0 w-24 font-bold uppercase tracking-wider text-[10px] py-0.5 ${
                      log.level === 'error' ? 'text-red-500' : 
                      log.level === 'warn' ? 'text-yellow-500' : 
                      'text-blue-500'
                    }`}>
                      {log.agent}
                    </span>
                    <span className={`break-all ${
                      log.level === 'error' ? 'text-red-200' : 
                      log.level === 'warn' ? 'text-yellow-100' : 
                      'text-gray-300'
                    }`}>
                      {log.message}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </div>
    </Layout>
  );
}
