"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useRide, AppView } from "@/context/RideContext";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { MobileFrame } from "@/components/MobileFrame";
import { StitchProjectModal } from "@/components/StitchProjectModal";
import { CampusWalletModal } from "@/components/CampusWalletModal";
import { AuthModal } from "@/components/AuthModal";
import { LoginPage } from "@/components/LoginPage";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

import { OnboardingView } from "@/components/views/OnboardingView";
import { StationsFleetView } from "@/components/views/StationsFleetView";
import { BookingUnlockView } from "@/components/views/BookingUnlockView";
import { ActiveRideView } from "@/components/views/ActiveRideView";
import { TripSummaryView } from "@/components/views/TripSummaryView";
import { CampusMapView } from "@/components/views/CampusMapView";

export default function CampusCycleApp({ initialView }: { initialView?: AppView }) {
  const router = useRouter();
  const { 
    currentView, 
    setCurrentView, 
    deviceViewMode, 
    isWalletModalOpen, 
    setIsWalletModalOpen,
    currentUser,
    isLoadingAuth 
  } = useRide();

  const [syncedInitial, setSyncedInitial] = useState(false);

  useEffect(() => {
    if (initialView && !syncedInitial) {
      setCurrentView(initialView);
      setSyncedInitial(true);
    }
  }, [initialView, syncedInitial, setCurrentView]);

  const activeView = (!syncedInitial && initialView) ? initialView : currentView;

  const renderActiveView = () => {
    switch (activeView) {
      case "map":
        return <CampusMapView />;
      case "onboarding":
        return <OnboardingView />;
      case "stations":
        return <StationsFleetView />;
      case "booking":
        return <BookingUnlockView />;
      case "active-ride":
        return <ActiveRideView />;
      case "trip-summary":
        return <TripSummaryView />;
      default:
        return <CampusMapView />;
    }
  };

  // 1. Unauthenticated Visitors: Dedicated Login Landing Page (Requirement 1)
  if (!currentUser) {
    return <LoginPage />;
  }

  // 3. Administrator Role: Dedicated Admin Dashboard (Requirement 1 & 4)
  if (currentUser.role === "admin") {
    return <AdminDashboard />;
  }

  // 4. Authenticated Student User Experience (Requirement 3: Campus Map as Landing Page)
  return (
    <div className="min-h-screen flex flex-col justify-between">
      <Header />

      <main className="flex-1">
        {deviceViewMode === "desktop" ? (
          renderActiveView()
        ) : (
          <MobileFrame>
            {renderActiveView()}
          </MobileFrame>
        )}
      </main>

      <Footer />
      <StitchProjectModal />
      <CampusWalletModal 
        isOpen={isWalletModalOpen} 
        onClose={() => setIsWalletModalOpen(false)} 
      />
      <AuthModal />
    </div>
  );
}
