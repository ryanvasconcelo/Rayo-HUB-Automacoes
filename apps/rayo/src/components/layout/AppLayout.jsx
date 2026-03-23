import { Link } from 'react-router-dom';
import { useTheme } from '../../hooks/useTheme';
import { Moon, Sun, ArrowLeft, ChevronRight, Home } from 'lucide-react';

/**
 * AppLayout wraps internal module pages with a standard Top Navbar and Breadcrumbs.
 */
export default function AppLayout({ children, breadcrumbs = [] }) {
    const { theme, toggle } = useTheme();

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
            <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-3 bg-background/80 backdrop-blur-md border-b border-border shadow-sm">
                <div className="flex items-center gap-4">
                    <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group">
                        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                        <Home size={16} />
                    </Link>
                    
                    <div className="h-4 w-px bg-border mx-2"></div>
                    
                    <nav className="flex items-center gap-1.5 text-sm font-medium">
                        <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors hidden sm:block">
                            Rayo Hub
                        </Link>
                        {breadcrumbs.length > 0 && (
                            <ChevronRight size={14} className="text-muted-foreground hidden sm:block" />
                        )}
                        {breadcrumbs.map((crumb, idx) => {
                            const isLast = idx === breadcrumbs.length - 1;
                            return (
                                <div key={crumb.label} className="flex items-center gap-1.5">
                                    <span className={isLast ? 'text-foreground' : 'text-muted-foreground hidden sm:block'}>
                                        {crumb.label}
                                    </span>
                                    {!isLast && <ChevronRight size={14} className="text-muted-foreground hidden sm:block" />}
                                </div>
                            );
                        })}
                    </nav>
                </div>

                <div className="flex items-center gap-4">
                    {/* Placeholder for future Actions/Profile/Notifications */}
                    <button onClick={toggle} className="p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                        {theme === 'light' ? <Sun size={18} /> : <Moon size={18} />}
                    </button>
                </div>
            </header>

            <main className="flex-1 w-full max-w-7xl mx-auto p-6 md:p-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                {children}
            </main>
        </div>
    );
}
