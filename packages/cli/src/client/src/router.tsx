import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { EpicDetail } from '@/pages/EpicDetail';
import { EpicList } from '@/pages/EpicList';
import { StoryDetail } from '@/pages/StoryDetail';

const routes = [
  {
    path: '/',
    element: <Layout />,
    children: [
      { path: '/', element: <EpicList /> },
      {
        path: 'epic/:slug',
        element: <EpicDetail />,
      },
      {
        path: 'epic/:epicSlug/story/:storySlug',
        element: <StoryDetail />,
      },
    ],
  },
];

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {routes.map((route) => (
          <Route key={route.path} path={route.path} element={route.element}>
            {route.children?.map((child) => (
              <Route key={child.path} path={child.path} element={child.element} />
            ))}
          </Route>
        ))}
      </Routes>
    </BrowserRouter>
  );
}

export default AppRouter;
