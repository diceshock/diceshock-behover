import { createFileRoute, Outlet } from "@tanstack/react-router";
import Footer from "@/client/components/diceshock/Footer";
import Header from "@/client/components/diceshock/Header";
import Msg from "@/client/components/diceshock/Msg";

export const Route = createFileRoute("/my-gsz")({
  component: MyGszLayout,
});

function MyGszLayout() {
  return (
    <>
      <Header />
      <Outlet />
      <Footer />
      <Msg />
    </>
  );
}
