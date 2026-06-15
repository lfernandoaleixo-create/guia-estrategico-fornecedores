import { Route, Switch, Redirect } from "wouter";
import ScopeWrapper from "@/components/ScopeWrapper";
import Home from "@yiwu/pages/Home";
import PrincipalDistribuidor from "@yiwu/pages/PrincipalDistribuidor";
import Suppliers from "@yiwu/pages/Suppliers";
import Metodologia from "@yiwu/pages/Metodologia";
import MarketMap from "@yiwu/pages/MarketMap";
import Anotacoes from "@yiwu/pages/Anotacoes";
import NotFound from "@yiwu/pages/NotFound";

export default function YiwuApp() {
  return (
    <ScopeWrapper scope="yiwu">
      <Switch>
        <Route path="/"><Redirect to="/anotacoes" /></Route>
        <Route path="/visao-geral" component={Home} />
        <Route path="/distribuidor" component={PrincipalDistribuidor} />
        <Route path="/flashgoods" component={PrincipalDistribuidor} />
        <Route path="/yiwu-furui" component={PrincipalDistribuidor} />
        <Route path="/fornecedores" component={Suppliers} />
        <Route path="/metodologia" component={Metodologia} />
        <Route path="/mapa" component={MarketMap} />
        <Route path="/anotacoes" component={Anotacoes} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </ScopeWrapper>
  );
}
