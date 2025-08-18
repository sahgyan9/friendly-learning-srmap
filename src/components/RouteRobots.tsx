import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const privatePaths = [/^\/admin(\b|\/)/, /^\/profile(\b|\/)/, /^\/messages(\b|\/)/, /^\/unauthorized$/];

const setMeta = (name: string, content: string) => {
    let tag = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
    if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('name', name);
        document.head.appendChild(tag);
    }
    tag.content = content;
};

export default function RouteRobots() {
    const { pathname } = useLocation();

    useEffect(() => {
        const isPrivate = privatePaths.some((re) => re.test(pathname));
        if (isPrivate) {
            setMeta('robots', 'noindex, nofollow, noarchive');
            setMeta('googlebot', 'noindex, nofollow');
        } else {
            setMeta('robots', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
            setMeta('googlebot', 'index, follow');
        }
    }, [pathname]);

    return null;
}
