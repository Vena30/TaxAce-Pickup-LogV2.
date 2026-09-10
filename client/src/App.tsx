import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import AppLayout from "./components/AppLayout";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import ClientProfile from "./pages/ClientProfile";
import RecordsList from "./pages/RecordsList";
import DuplicateReview from "./pages/DuplicateReview";
import CsvImport from "./pages/CsvImport";
import TeamManagement from "./pages/TeamManagement";
import ChangePassword from "./pages/ChangePassword";

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/clients" component={Clients} />
        <Route path="/clients/:id" component={ClientProfile} />

        {/* All Records */}
        <Route path="/records">
          {() => (
            <RecordsList
              key="all-records"
              title="All Records"
              description="All tax year records across every client and business."
            />
          )}
        </Route>

        {/* Filtered by status — new 8-status workflow */}
        <Route path="/records/in-vault">
          {() => (
            <RecordsList
              key="in-vault"
              title="In Vault"
              description="Tax year records physically confirmed in the vault."
              filterStatus="In Vault"
            />
          )}
        </Route>
        <Route path="/records/contacted">
          {() => (
            <RecordsList
              key="contacted"
              title="Contacted"
              description="Records where the client has been spoken to."
              filterStatus="Contacted"
            />
          )}
        </Route>
        <Route path="/records/scheduled">
          {() => (
            <RecordsList
              key="scheduled"
              title="Scheduled"
              description="Records with a scheduled pickup date."
              filterStatus="Scheduled"
            />
          )}
        </Route>
        <Route path="/records/prepped">
          {() => (
            <RecordsList
              key="prepped-pickup"
              title="Prepped for Pickup"
              description="Records that have been prepped and are ready for pickup."
              filterStatus="Prepped for Pickup"
            />
          )}
        </Route>
        <Route path="/records/picked-up">
          {() => (
            <RecordsList
              key="picked-up"
              title="Picked Up"
              description="Tax year records that have been picked up by clients."
              filterStatus="Picked Up"
            />
          )}
        </Route>
        <Route path="/records/prepped-mail">
          {() => (
            <RecordsList
              key="prepped-mail"
              title="Prepped for Mail"
              description="Records that have been prepped and are ready to be mailed."
              filterStatus="Prepped for Mail"
            />
          )}
        </Route>
        <Route path="/records/mailed">
          {() => (
            <RecordsList
              key="mailed"
              title="Mailed"
              description="Tax year records that have been mailed to clients."
              filterStatus="Mailed"
            />
          )}
        </Route>
        <Route path="/records/prep-to-shred">
          {() => (
            <RecordsList
              key="prep-to-shred"
              title="Prep to Shred"
              description="Records queued or being prepared for shredding."
              filterStatus="Prep to Shred"
            />
          )}
        </Route>
        <Route path="/records/shredded">
          {() => (
            <RecordsList
              key="shredded"
              title="Shredded"
              description="Records that have been shredded."
              filterStatus="Shredded"
            />
          )}
        </Route>
        <Route path="/records/hold">
          {() => (
            <RecordsList
              key="hold"
              title="Hold"
              description="Records on hold — file not located or client action required."
              filterStatus="Hold"
            />
          )}
        </Route>

        <Route path="/duplicates" component={DuplicateReview} />
        <Route path="/import" component={CsvImport} />
        <Route path="/admin/team" component={TeamManagement} />
        <Route path="/account/change-password" component={ChangePassword} />

        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
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
