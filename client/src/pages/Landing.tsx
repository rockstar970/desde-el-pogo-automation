import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Music2, PlayCircle, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <nav className="border-b border-white/5 p-6 backdrop-blur-sm fixed top-0 w-full z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg shadow-primary/20">
              <Music2 className="h-6 w-6 text-white" />
            </div>
            <h1 className="font-display font-bold text-xl">Desde el Pogo</h1>
          </div>
          <Link href={user ? "/dashboard" : "/api/login"}>
            <Button variant="outline" className="border-primary/20 hover:bg-primary/10 text-primary">
              {user ? "Go to Dashboard" : "Access Dashboard"}
            </Button>
          </Link>
        </div>
      </nav>

      <main className="flex-1 flex items-center justify-center relative overflow-hidden pt-20">
        {/* Background Elements */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="max-w-4xl mx-auto px-6 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-primary mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              Autonomous Concert Coverage
            </div>
            
            <h1 className="text-5xl md:text-7xl font-display font-bold text-white mb-6 leading-tight">
              The Future of <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-400">
                Concert Culture
              </span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              Automated video generation system capturing the pulse of live music. 
              Powered by autonomous AI agents.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href="/api/login">
                <Button size="lg" className="h-14 px-8 text-lg bg-white text-black hover:bg-gray-200 rounded-full font-semibold shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all hover:scale-105">
                  Launch Console
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </a>
              <Button size="lg" variant="ghost" className="h-14 px-8 text-lg rounded-full hover:bg-white/5 text-muted-foreground hover:text-white">
                <PlayCircle className="mr-2 h-5 w-5" />
                Watch Demo
              </Button>
            </div>
          </motion.div>
        </div>
      </main>

      <footer className="border-t border-white/5 py-8 text-center text-sm text-muted-foreground bg-black/20">
        <p>&copy; {new Date().getFullYear()} Desde el Pogo Automation Systems. All rights reserved.</p>
      </footer>
    </div>
  );
}
