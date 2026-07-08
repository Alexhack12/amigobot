import Sidebar from "../components/Sidebar";

function MainLayout({ children, onOpenDashboard }) {
  return (
    <div className="home">
      <Sidebar onOpenDashboard={onOpenDashboard} />
      {children}
    </div>
  );
}

export default MainLayout;