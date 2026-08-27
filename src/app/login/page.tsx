import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import LoginForm from "@/components/LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; reset?: string }>;
}) {
  const { redirect: redirectTo, reset } = await searchParams;

  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
        {reset === "success" && (
          <p className="mb-4 rounded-full bg-teal-50 px-4 py-2 text-sm text-teal-700">
            Password reset. You can log in now.
          </p>
        )}
        <LoginForm redirectTo={redirectTo} />
      </main>
      <SiteFooter />
    </>
  );
}
