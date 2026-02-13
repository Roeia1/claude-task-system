import { BrowserRouter, Route, Routes } from 'react-router';
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
        path: 'epic/:epicId',
        element: <EpicDetail />,
      },
      {
        path: 'story/:storyId',
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
