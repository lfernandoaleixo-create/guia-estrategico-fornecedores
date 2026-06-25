import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { lazy, Suspense } from "react";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";

// Páginas pesadas e sub-apps são carregadas sob demanda (code splitting),
// para manter a Home leve e rápida.
const NotFound = lazy(() => import("@/pages/NotFound"));
const AdicionarPage = lazy(() => import("./pages/Adicionar"));
const GrupoDashboard = lazy(() => import("./pages/GrupoDashboard"));
const SubgroupDashboard = lazy(() => import("./pages/SubgroupDashboard"));
const AquarioApp = lazy(() => import("@aquario/AquarioApp"));
const TapeteApp = lazy(() => import("@tapete/TapeteApp"));
const YiwuApp = lazy(() => import("@yiwu/YiwuApp"));

function RouteFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-current border-t-transparent" />
        <p className="text-sm">Carregando…</p>
      </div>
    </div>
  );
}

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Suspense fallback={<RouteFallback />}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/adicionar" component={AdicionarPage} />
        <Route path="/grupo/:groupId" component={GrupoDashboard} />
        <Route path="/subgrupo/:id" component={SubgroupDashboard} />
        <Route path="/aquario" nest>
          <AquarioApp />
        </Route>
        <Route path="/tapete" nest>
          <TapeteApp />
        </Route>
        <Route path="/yiwu" nest>
          <YiwuApp />
        </Route>
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
