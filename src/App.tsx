import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Welcome from "./pages/Welcome";
import CareersPage from "./pages/CareersPage";
import { Career } from "./common/interfaces/Career";
import { createElement, lazy, Suspense } from "react";
import AddSeasons from "./pages/AddSeasons";
import Season from "./pages/Season";
import Geral from "./pages/Geral";
import Players from "./pages/Players";
import { useIsMobile } from "./common/hooks/useIsMobile";
import Load from "./components/Load";

const Academy = lazy(() =>
  import("./pages/Academy").then((m) => ({ default: m.Academy })),
);
const GroupCareerPage = lazy(() =>
  import("./pages/GroupCareerPage").then((m) => ({
    default: m.GroupCareerPage,
  })),
);
const ComparePlayers = lazy(() =>
  import("./pages/ComparePlayers").then((m) => ({
    default: m.ComparePlayers,
  })),
);
const Match = lazy(() =>
  import("./pages/Match").then((m) => ({ default: m.Match })),
);
const Tutorial = lazy(() => import("./pages/Tutorial"));

const withSuspense = (element: React.ReactNode) => (
  <Suspense fallback={<Load />}>{element}</Suspense>
);

type AppProps = {
  career?: Career;
};

export default function App({ career }: AppProps) {
  const isMobile = useIsMobile();

  if (!isMobile) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <h2>Acesso Restrito</h2>
        <p>Este aplicativo foi desenvolvido apenas para dispositivos móveis.</p>
        <p>Por favor, acesse pelo seu celular.</p>
      </div>
    );
  }

  const router = createBrowserRouter([
    { path: "/", element: <Welcome /> },
    { path: "/Career/:careerId/Academy", element: withSuspense(<Academy />) },
    { path: "/Career/:careerId/Geral", element: <Geral /> },
    { path: "/Career/:careerId/Geral/Player/:playerId", element: <Players /> },
    {
      path: "/Career/:careerId/Season/:seasonId/Player/:playerId",
      element: <Players />,
    },

    { path: "/Career/:careerId", element: <AddSeasons /> },
    { path: "/Career/:careerId/Season/:seasonId", element: <Season /> },
    {
      path: "/CareersPage",
      element: createElement(CareersPage, { career }),
    },
    {
      path: "/CareerGroup/:groupId/Geral",
      element: withSuspense(<GroupCareerPage />),
    },
    {
      path: "/Career/:careerId/Season/:seasonId/Compare",
      element: withSuspense(<ComparePlayers />),
    },
    {
      path: "/Career/:careerId/Geral/Compare",
      element: withSuspense(<ComparePlayers />),
    },
    {
      path: "/Career/:careerId/Geral/Player/:playerId/Compare",
      element: withSuspense(<ComparePlayers />),
    },

    {
      path: "/Career/:careerId/Season/:seasonId/Match/:matchesId",
      element: withSuspense(<Match />),
    },

    { path: "/tutorial", element: withSuspense(<Tutorial />) },
  ]);

  return <RouterProvider router={router} />;
}
