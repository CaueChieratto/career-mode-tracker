import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Welcome from "./pages/Welcome";
import CareersPage from "./pages/CareersPage";
import { createElement, lazy, Suspense, useEffect } from "react";
import Season from "./pages/Season";
import Geral from "./pages/Geral";
import { useIsMobile } from "./common/hooks/useIsMobile";
import Load from "./components/Load";
import { toast } from "./common/services/ToastService";
import { NavigationSessionStore } from "./common/services/NavigationSessionStore";
import { classifyMacroRoute } from "./common/hooks/useMacroNavigationSession";

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

const router = createBrowserRouter([
  { path: "/", element: <Welcome /> },
  { path: "/Career/:careerId/Academy", element: withSuspense(<Academy />) },
  { path: "/Career/:careerId/Geral", element: <Geral /> },

  { path: "/Career/:careerId/Season/:seasonId", element: <Season /> },
  {
    path: "/CareersPage",
    element: createElement(
      Suspense,
      { fallback: createElement(Load) },
      createElement(CareersPage),
    ),
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

export default function App() {
  const isMobile = useIsMobile();

  useEffect(() => {
    let prevPathname = router.state.location.pathname;

    const handleRouteChange = (pathname: string) => {
      const { type, macroKey } = classifyMacroRoute(pathname);
      const currentMacro = NavigationSessionStore.getMacroContext();

      if (type === "outside") {
        if (currentMacro) {
          NavigationSessionStore.clearAll();
        }
      } else if (type === "macro" && macroKey) {
        if (currentMacro !== macroKey) {
          NavigationSessionStore.clearAll();
          NavigationSessionStore.setMacroContext(macroKey);
          NavigationSessionStore.setTab(`club:${macroKey}`, 0);
          NavigationSessionStore.setTab(macroKey, 0);
        }
      } else if (type === "child") {
        if (!currentMacro && macroKey) {
          NavigationSessionStore.setMacroContext(macroKey);
          NavigationSessionStore.setTab(`club:${macroKey}`, 0);
          NavigationSessionStore.setTab(macroKey, 0);
        }
      }
    };

    handleRouteChange(prevPathname);

    const unsubscribe = router.subscribe((state) => {
      if (state.location.pathname !== prevPathname) {
        prevPathname = state.location.pathname;
        toast.cancelPendingConfirms();
        handleRouteChange(state.location.pathname);
      }
    });

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (router.state.location.pathname.includes("/Match/")) return;
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const interactive = target.closest(
        "button, a, [role='button'], [data-testid], li[class*='item'], div[class*='card']",
      ) as HTMLElement | null;
      if (!interactive) return;

      const testId = interactive.getAttribute("data-testid");
      const id = interactive.id;
      let selector = "";
      if (testId) {
        selector = `[data-testid="${testId}"]`;
      } else if (id) {
        selector = `#${id}`;
      }

      const rect = interactive.getBoundingClientRect();
      const currentMacro = NavigationSessionStore.getMacroContext();
      if (currentMacro) {
        NavigationSessionStore.saveClickAnchor("last_click", {
          scrollY: window.scrollY,
          anchorSelector: selector || undefined,
          viewportOffsetTop: rect.top,
          updatedAt: Date.now(),
        });
      }
    };

    window.addEventListener("pointerdown", handlePointerDown, {
      capture: true,
      passive: true,
    });

    return () => {
      unsubscribe();
      window.removeEventListener("pointerdown", handlePointerDown, {
        capture: true,
      });
    };
  }, []);

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

  return <RouterProvider router={router} />;
}
