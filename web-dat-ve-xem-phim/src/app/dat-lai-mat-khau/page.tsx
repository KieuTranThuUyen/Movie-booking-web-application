import { ResetPasswordForm } from '@/components/forms/reset-password-form';

type Props = {
  searchParams: Promise<{ token?: string }>;
};

export default async function ResetPasswordPage({ searchParams }: Props) {
  const params = await searchParams;
  const token = params.token?.trim() ?? '';

  return (
    <main className="page-shell py-12 lg:py-16">
      <div className="mx-auto max-w-lg">
        <ResetPasswordForm token={token} />
      </div>
    </main>
  );
}
