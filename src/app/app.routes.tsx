"use client";
// Profile imports 
import ProfileLessons from '../components/Profile/ProfileLessons';
import ProfileMessages from '../components/Profile/ProfileMessages';
import ProfilePage from '../components/Profile/ProfilePage';
import ProfileSidebar from '../components/Profile/ProfileSidebar';
import SkillSwapLanding from '../components/landing/SkillSwapLanding';

// Dashboard imports 
import Dashboard from '../components/dashboard/Dashboard';
import SkillList from '../components/dashboard/  SkillList';
import Categories from '../components/dashboard/ Categories';
// import ExchangeRequestModal from './components/dashboard/ExchangeRequestModal';
import SearchBar from '../components/dashboard/ SearchBar';
import SkillCard from '../components/dashboard/ SkillCard';
import AccordionSection from '../components/dashboard/AccordionSection';
import Header from '../components/shared/header/Header';

//  Auth imports 
import Login from './auth/login-and-signup/page';
import ForgotPassword from './auth/forgot-password/page';

//  Skills dynamic routes 
import SkillPage from './skills/[skillId]/page';
import SectionPage from './skills/[skillId]/[sectionId]/page';

// Main profile page (if present)
import ProfileMainPage from './profile/page';

//  React Router 
import { RouteObject } from 'react-router-dom';

export const routes: RouteObject[] = [
  // Landing
  { path: '/', element: <SkillSwapLanding /> },

  //Profile section routes 
  { path: '/profile', element: <ProfilePage /> },
  { path: '/profile/lessons', element: <ProfileLessons /> },
  { path: '/profile/messages', element: <ProfileMessages /> },
  { path: '/profile/sidebar', element: <ProfileSidebar /> },
  { path: '/profile/main', element: <ProfileMainPage /> }, 

  //  Dashboard routes 
  { path: '/dashboard', element: <Dashboard /> },
  { path: '/dashboard/skills', element: <SkillList /> },
  { path: '/dashboard/categories', element: <Categories /> },
  { path: '/dashboard/exchange-request', element: <ExchangeRequestModal /> },
  { path: '/dashboard/search', element: <SearchBar /> },
  { path: '/dashboard/skill-card', element: <SkillCard /> },
  { path: '/dashboard/accordion', element: <AccordionSection /> },
  { path: '/dashboard/header', element: <Header /> },

  //  Auth routes
  { path: '/login', element: <Login /> },
  { path: '/forgot-password', element: <ForgotPassword /> },

  //  Skills dynamic routes 
  { path: '/skills/:skillId', element: <SkillPage /> },
  { path: '/skills/:skillId/:sectionId', element: <SectionPage /> },
];
