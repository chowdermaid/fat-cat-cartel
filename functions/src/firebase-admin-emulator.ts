if (
  process.env.FUNCTIONS_EMULATOR === "true" &&
  !process.env.FIREBASE_DATABASE_EMULATOR_HOST
) {
  process.env.FIREBASE_DATABASE_EMULATOR_HOST = "127.0.0.1:9000";
}
