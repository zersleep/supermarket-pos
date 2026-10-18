import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

export default function MainLayout() {
  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content-wrapper">
        <TopBar />
        <main className="page-container">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
