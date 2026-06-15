import { Route, Switch, Redirect } from "wouter";
import ScopeWrapper from "@/components/ScopeWrapper";
import Home from "@tapete/pages/Home";
import Exportadores from "@tapete/pages/Exportadores";
import Importadores from "@tapete/pages/Importadores";
import Materiais from "@tapete/pages/Materiais";
import Tutorial from "@tapete/pages/Tutorial";
import Tributacao from "@tapete/pages/Tributacao";
import Cruzamento from "@tapete/pages/Cruzamento";
import Contato from "@tapete/pages/Contato";
import Comparador from "@tapete/pages/Comparador";
import Anotacoes from "@tapete/pages/Anotacoes";
import NotFound from "@tapete/pages/NotFound";

export default function TapeteApp() {
  return (
    <ScopeWrapper scope="tapete">
      <Switch>
        <Route path="/"><Redirect to="/anotacoes" /></Route>
        <Route path="/painel" component={Home} />
        <Route path="/exportadores" component={Exportadores} />
        <Route path="/importadores" component={Importadores} />
        <Route path="/materiais" component={Materiais} />
        <Route path="/tutorial" component={Tutorial} />
        <Route path="/tributacao" component={Tributacao} />
        <Route path="/cruzamento" component={Cruzamento} />
        <Route path="/contato" component={Contato} />
        <Route path="/comparador" component={Comparador} />
        <Route path="/anotacoes" component={Anotacoes} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </ScopeWrapper>
  );
}
