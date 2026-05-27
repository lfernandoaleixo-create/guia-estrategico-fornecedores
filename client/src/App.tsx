import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import AdicionarPage from "./pages/Adicionar";
import GrupoDashboard from "./pages/GrupoDashboard";
import AquarioApp from "@aquario/AquarioApp";
import TapeteApp from "@tapete/TapeteApp";
import YiwuApp from "@yiwu/YiwuApp";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/adicionar" component={AdicionarPage} />
      <Route path="/grupo/:groupId" component={GrupoDashboard} />
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
