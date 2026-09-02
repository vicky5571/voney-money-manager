import assert from "node:assert/strict";
import {
  changePasswordSchema,
  setInitialPasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../validations/auth";

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (e) {
    console.error(`✗ ${name}`, e);
    process.exitCode = 1;
  }
}

// 1. Change Password Schema Tests
test("changePasswordSchema succeeds with valid inputs", () => {
  const result = changePasswordSchema.safeParse({
    currentPassword: "oldPassword123",
    newPassword: "newPassword456",
    confirmPassword: "newPassword456",
  });
  assert.equal(result.success, true);
});

test("changePasswordSchema fails if current password is empty", () => {
  const result = changePasswordSchema.safeParse({
    currentPassword: "",
    newPassword: "newPassword456",
    confirmPassword: "newPassword456",
  });
  assert.equal(result.success, false);
});

test("changePasswordSchema fails if new password is less than 6 characters", () => {
  const result = changePasswordSchema.safeParse({
    currentPassword: "oldPassword123",
    newPassword: "12345",
    confirmPassword: "12345",
  });
  assert.equal(result.success, false);
  if (!result.success) {
    assert.equal(
      result.error.issues[0]?.message,
      "New password must be at least 6 characters",
    );
  }
});

test("changePasswordSchema fails if newPassword and confirmPassword do not match", () => {
  const result = changePasswordSchema.safeParse({
    currentPassword: "oldPassword123",
    newPassword: "newPassword456",
    confirmPassword: "mismatchPassword",
  });
  assert.equal(result.success, false);
  if (!result.success) {
    assert.equal(result.error.issues[0]?.message, "New passwords do not match");
  }
});

test("changePasswordSchema fails if new password is identical to current password", () => {
  const result = changePasswordSchema.safeParse({
    currentPassword: "samePassword123",
    newPassword: "samePassword123",
    confirmPassword: "samePassword123",
  });
  assert.equal(result.success, false);
  if (!result.success) {
    assert.equal(
      result.error.issues[0]?.message,
      "New password must be different from your current password",
    );
  }
});

// 2. Set Initial Password Schema Tests (OAuth)
test("setInitialPasswordSchema succeeds with valid password and confirmation", () => {
  const result = setInitialPasswordSchema.safeParse({
    newPassword: "secureOAuthPass123",
    confirmPassword: "secureOAuthPass123",
  });
  assert.equal(result.success, true);
});

test("setInitialPasswordSchema fails when passwords do not match", () => {
  const result = setInitialPasswordSchema.safeParse({
    newPassword: "secureOAuthPass123",
    confirmPassword: "differentOAuthPass",
  });
  assert.equal(result.success, false);
  if (!result.success) {
    assert.equal(result.error.issues[0]?.message, "New passwords do not match");
  }
});

test("setInitialPasswordSchema fails when password is less than 6 characters", () => {
  const result = setInitialPasswordSchema.safeParse({
    newPassword: "123",
    confirmPassword: "123",
  });
  assert.equal(result.success, false);
});

// 3. Forgot Password Schema Tests
test("forgotPasswordSchema succeeds with valid email", () => {
  const result = forgotPasswordSchema.safeParse({
    email: "user@example.com",
  });
  assert.equal(result.success, true);
});

test("forgotPasswordSchema fails with invalid email", () => {
  const result = forgotPasswordSchema.safeParse({
    email: "invalid-email",
  });
  assert.equal(result.success, false);
});

test("forgotPasswordSchema fails with empty email", () => {
  const result = forgotPasswordSchema.safeParse({
    email: "",
  });
  assert.equal(result.success, false);
});

// 4. Reset Password Schema Tests
test("resetPasswordSchema succeeds with matching >= 6 char passwords", () => {
  const result = resetPasswordSchema.safeParse({
    newPassword: "securePassword789",
    confirmPassword: "securePassword789",
  });
  assert.equal(result.success, true);
});

test("resetPasswordSchema fails when passwords do not match", () => {
  const result = resetPasswordSchema.safeParse({
    newPassword: "securePassword789",
    confirmPassword: "differentPassword",
  });
  assert.equal(result.success, false);
});

test("resetPasswordSchema fails when password is too short", () => {
  const result = resetPasswordSchema.safeParse({
    newPassword: "123",
    confirmPassword: "123",
  });
  assert.equal(result.success, false);
});

console.log("Auth validation tests completed successfully!");
