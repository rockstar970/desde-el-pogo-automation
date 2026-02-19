import { Layout } from "@/components/Layout";
import { useVideos } from "@/hooks/use-videos";
import { CreateVideoDialog } from "@/components/CreateVideoDialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  PlayCircle,
  Film,
  Calendar,
  Activity
} from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";

export default function Videos() {
  const { data: videos, isLoading } = useVideos();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return "bg-green-500/10 text-green-500 border-green-500/20";
      case 'failed': 
      case 'compliance_failed': return "bg-red-500/10 text-red-500 border-red-500/20";
      case 'processing':
      case 'editing':
      case 'curating_visuals':
      case 'generating_text': return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      default: return "bg-primary/10 text-primary border-primary/20";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'published': return <CheckCircle2 className="w-3 h-3 mr-1" />;
      case 'failed':
      case 'compliance_failed': return <AlertCircle className="w-3 h-3 mr-1" />;
      case 'processing':
      case 'editing': return <Activity className="w-3 h-3 mr-1 animate-spin" />;
      default: return <Clock className="w-3 h-3 mr-1" />;
    }
  };

  return (
    <Layout>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-display font-bold text-white mb-2">Video Library</h2>
          <p className="text-muted-foreground">Manage and track generated content.</p>
        </div>
        <CreateVideoDialog />
      </div>

      <div className="grid grid-cols-1 gap-4">
        {isLoading ? (
          Array(3).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl bg-card/50" />
          ))
        ) : videos?.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-border rounded-xl">
            <Film className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
            <h3 className="text-lg font-medium">No videos generated yet</h3>
            <p className="text-muted-foreground">Start the autonomous agent to create content.</p>
          </div>
        ) : (
          videos?.map((video, i) => (
            <motion.div
              key={video.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="bg-card/50 border-border/50 hover:border-primary/50 transition-all duration-300 group">
                <CardContent className="p-6 flex items-center gap-6">
                  {/* Thumbnail / Icon */}
                  <div className="h-16 w-16 rounded-lg bg-black/40 flex items-center justify-center border border-white/5 group-hover:bg-primary/5 transition-colors">
                    <PlayCircle className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-medium truncate text-foreground group-hover:text-primary transition-colors">
                        {video.prompt || "Auto-generated Topic"}
                      </h3>
                      <Badge variant="outline" className={getStatusColor(video.status)}>
                        {getStatusIcon(video.status)}
                        {video.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-6 text-sm text-muted-foreground mt-1">
                      <div className="flex items-center gap-1.5 font-mono text-[10px]">
                        ID: {video.id} {video.renderId ? `| Render: ${video.renderId}` : ""}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6 text-sm text-muted-foreground mt-2">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        {video.createdAt && format(new Date(video.createdAt), "MMM d, yyyy HH:mm")}
                      </div>
                      {video.error && (
                        <span className="text-red-400 text-xs bg-red-950/30 px-2 py-0.5 rounded border border-red-900/50">
                          Error: {video.error}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action Area (could add view details button later) */}
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>
    </Layout>
  );
}
