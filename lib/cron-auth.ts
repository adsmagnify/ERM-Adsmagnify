export function cronAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = request.headers.get("authorization");
  const fromVercel = request.headers.get("x-vercel-cron") === "1";
  return (
    fromVercel ||
    (secret ? auth === `Bearer ${secret}` : process.env.NODE_ENV !== "production")
  );
}
