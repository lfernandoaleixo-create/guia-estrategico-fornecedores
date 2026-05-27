import { Route, Switch } from "wouter";
import ScopeWrapper from "@/components/ScopeWrapper";
import Home from "@aquario/pages/Home";
import NotFound from "@aquario/pages/NotFound";

export default function AquarioApp() {
  return (
    <ScopeWrapper scope="aquario">
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </ScopeWrapper>
  );
}
