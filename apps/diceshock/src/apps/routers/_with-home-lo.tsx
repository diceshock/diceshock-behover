import { createFileRoute, Outlet } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import Footer from "@/client/components/diceshock/Footer";
import Header from "@/client/components/diceshock/Header";
import Msg from "@/client/components/diceshock/Msg";

const FloatingOccupancyBar = lazy(
  () => import("@/client/components/diceshock/FloatingOccupancyBar"),
);

export const Route = createFileRoute("/_with-home-lo")({
  component: _Home,
});

function _Home() {
  return (
    <>
      <Header />

      <Outlet />

      <Footer />

      <Msg />

      <Suspense>
        <FloatingOccupancyBar />
      </Suspense>
    </>
  );
}
