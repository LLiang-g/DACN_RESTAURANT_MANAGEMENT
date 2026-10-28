import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

interface RouterContextValue {
  pathname: string;
  navigate: (to: string) => void;
}

const RouterContext = createContext<RouterContextValue>({
  pathname: "/dashboard",
  navigate: () => {},
});

function getCleanPath(): string {
  const hash = window.location.hash;
  if (!hash || hash === "#" || hash === "#/") {
    return "/dashboard";
  }
  const path = hash.startsWith("#") ? hash.slice(1) : hash;
  return path.startsWith("/") ? path : `/${path}`;
}

export function RouterProvider({ children }: { children: ReactNode }) {
  const [pathname, setPathname] = useState<string>(getCleanPath);

  useEffect(() => {
    const handleHashChange = () => {
      setPathname(getCleanPath());
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const navigate = (to: string) => {
    const target = to.startsWith("/") ? to : `/${to}`;
    window.location.hash = target;
    setPathname(target);
  };

  return (
    <RouterContext.Provider value={{ pathname, navigate }}>
      {children}
    </RouterContext.Provider>
  );
}

export function useRouter() {
  return useContext(RouterContext);
}

export function useLocation() {
  const { pathname } = useContext(RouterContext);
  return { pathname };
}

export function useNavigate() {
  const { navigate } = useContext(RouterContext);
  return navigate;
}

interface NavLinkProps {
  to: string;
  className?: string | ((props: { isActive: boolean }) => string);
  children: ReactNode;
}

export function NavLink({ to, className, children }: NavLinkProps) {
  const { pathname, navigate } = useContext(RouterContext);
  const isActive = pathname === to || pathname.startsWith(to + "/");

  const classResult =
    typeof className === "function" ? className({ isActive }) : className;

  return (
    <a
      href={`#${to}`}
      className={classResult}
      onClick={(e) => {
        e.preventDefault();
        navigate(to);
      }}
    >
      {children}
    </a>
  );
}
