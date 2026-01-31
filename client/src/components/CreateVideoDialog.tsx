import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles, Video } from "lucide-react";
import { useCreateVideo } from "@/hooks/use-videos";
import { useToast } from "@/hooks/use-toast";

export function CreateVideoDialog() {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const createVideo = useCreateVideo();
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createVideo.mutate(
      { forcePrompt: prompt || undefined },
      {
        onSuccess: () => {
          setOpen(false);
          setPrompt("");
          toast({
            title: "Generation Started",
            description: "The autonomous agent is now processing your request.",
          });
        },
        onError: (error) => {
          toast({
            title: "Error",
            description: error.message,
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all duration-300">
          <Sparkles className="mr-2 h-4 w-4" />
          Trigger Generation
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-card border-border shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-xl">
            <Video className="h-5 w-5 text-primary" />
            Start Video Generation
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          <div className="space-y-2">
            <Label htmlFor="prompt" className="text-sm font-medium">
              Optional Prompt Override
            </Label>
            <Textarea
              id="prompt"
              placeholder="Leave empty for autonomous topic selection..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[100px] bg-secondary/50 border-border focus:ring-primary/20 resize-none font-sans"
            />
            <p className="text-xs text-muted-foreground">
              If empty, the AI agent will select a trending topic from recent concert news.
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createVideo.isPending}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {createVideo.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Starting...
                </>
              ) : (
                "Start Generation"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
