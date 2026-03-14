import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// --- Mocks ---

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockSignIn = vi.fn();
const mockSignUp = vi.fn();
vi.mock("@/actions", () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
  signUp: (...args: unknown[]) => mockSignUp(...args),
}));

const mockGetAnonWorkData = vi.fn();
const mockClearAnonWork = vi.fn();
vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: () => mockGetAnonWorkData(),
  clearAnonWork: () => mockClearAnonWork(),
}));

const mockGetProjects = vi.fn();
vi.mock("@/actions/get-projects", () => ({
  getProjects: () => mockGetProjects(),
}));

const mockCreateProject = vi.fn();
vi.mock("@/actions/create-project", () => ({
  createProject: (...args: unknown[]) => mockCreateProject(...args),
}));

// --- Tests ---

import { useAuth } from "@/hooks/use-auth";

beforeEach(() => {
  vi.clearAllMocks();
  mockGetAnonWorkData.mockReturnValue(null);
  mockGetProjects.mockResolvedValue([]);
  mockCreateProject.mockResolvedValue({ id: "new-project-id" });
});

describe("useAuth — initial state", () => {
  test("isLoading starts as false", () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.isLoading).toBe(false);
  });

  test("exposes signIn, signUp, and isLoading", () => {
    const { result } = renderHook(() => useAuth());
    expect(typeof result.current.signIn).toBe("function");
    expect(typeof result.current.signUp).toBe("function");
    expect(typeof result.current.isLoading).toBe("boolean");
  });
});

describe("signIn", () => {
  test("sets isLoading to true while in-flight, false after", async () => {
    let resolveSignIn!: (value: { success: boolean }) => void;
    mockSignIn.mockReturnValue(new Promise((r) => (resolveSignIn = r)));

    const { result } = renderHook(() => useAuth());

    let promise: Promise<unknown>;
    act(() => {
      promise = result.current.signIn("a@b.com", "password123");
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolveSignIn({ success: false });
      await promise;
    });

    expect(result.current.isLoading).toBe(false);
  });

  test("returns the result from signInAction", async () => {
    mockSignIn.mockResolvedValue({ success: false, error: "Invalid credentials" });

    const { result } = renderHook(() => useAuth());
    let returned: unknown;
    await act(async () => {
      returned = await result.current.signIn("a@b.com", "wrong");
    });

    expect(returned).toEqual({ success: false, error: "Invalid credentials" });
  });

  test("does not navigate when signIn fails", async () => {
    mockSignIn.mockResolvedValue({ success: false, error: "Invalid credentials" });

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signIn("a@b.com", "wrong");
    });

    expect(mockPush).not.toHaveBeenCalled();
  });

  test("forwards email and password to signInAction", async () => {
    mockSignIn.mockResolvedValue({ success: false });

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signIn("user@example.com", "hunter2");
    });

    expect(mockSignIn).toHaveBeenCalledWith("user@example.com", "hunter2");
  });

  test("sets isLoading to false even when signInAction throws", async () => {
    mockSignIn.mockRejectedValue(new Error("network error"));

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signIn("a@b.com", "pass").catch(() => {});
    });

    expect(result.current.isLoading).toBe(false);
  });
});

describe("signUp", () => {
  test("sets isLoading to true while in-flight, false after", async () => {
    let resolveSignUp!: (value: { success: boolean }) => void;
    mockSignUp.mockReturnValue(new Promise((r) => (resolveSignUp = r)));

    const { result } = renderHook(() => useAuth());

    let promise: Promise<unknown>;
    act(() => {
      promise = result.current.signUp("a@b.com", "password123");
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolveSignUp({ success: false });
      await promise;
    });

    expect(result.current.isLoading).toBe(false);
  });

  test("returns the result from signUpAction", async () => {
    mockSignUp.mockResolvedValue({ success: false, error: "Email already registered" });

    const { result } = renderHook(() => useAuth());
    let returned: unknown;
    await act(async () => {
      returned = await result.current.signUp("existing@b.com", "password123");
    });

    expect(returned).toEqual({ success: false, error: "Email already registered" });
  });

  test("does not navigate when signUp fails", async () => {
    mockSignUp.mockResolvedValue({ success: false, error: "Email already registered" });

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signUp("a@b.com", "pass");
    });

    expect(mockPush).not.toHaveBeenCalled();
  });

  test("sets isLoading to false even when signUpAction throws", async () => {
    mockSignUp.mockRejectedValue(new Error("network error"));

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signUp("a@b.com", "pass").catch(() => {});
    });

    expect(result.current.isLoading).toBe(false);
  });
});

describe("post-sign-in navigation — anonymous work present", () => {
  const anonWork = {
    messages: [{ role: "user", content: "hello" }],
    fileSystemData: { "/": { type: "directory" } },
  };

  beforeEach(() => {
    mockGetAnonWorkData.mockReturnValue(anonWork);
    mockCreateProject.mockResolvedValue({ id: "anon-project-id" });
  });

  test("creates a project with anonymous work data and navigates to it", async () => {
    mockSignIn.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signIn("a@b.com", "pass");
    });

    expect(mockCreateProject).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: anonWork.messages,
        data: anonWork.fileSystemData,
      })
    );
    expect(mockPush).toHaveBeenCalledWith("/anon-project-id");
  });

  test("clears anonymous work after saving it", async () => {
    mockSignIn.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signIn("a@b.com", "pass");
    });

    expect(mockClearAnonWork).toHaveBeenCalledOnce();
  });

  test("skips getProjects when anonymous work exists", async () => {
    mockSignIn.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signIn("a@b.com", "pass");
    });

    expect(mockGetProjects).not.toHaveBeenCalled();
  });

  test("works the same for signUp", async () => {
    mockSignUp.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signUp("a@b.com", "pass");
    });

    expect(mockCreateProject).toHaveBeenCalledWith(
      expect.objectContaining({ messages: anonWork.messages })
    );
    expect(mockClearAnonWork).toHaveBeenCalledOnce();
    expect(mockPush).toHaveBeenCalledWith("/anon-project-id");
  });
});

describe("post-sign-in navigation — no anonymous work, existing projects", () => {
  beforeEach(() => {
    mockGetAnonWorkData.mockReturnValue(null);
    mockGetProjects.mockResolvedValue([{ id: "project-1" }, { id: "project-2" }]);
  });

  test("navigates to the most recent project", async () => {
    mockSignIn.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signIn("a@b.com", "pass");
    });

    expect(mockPush).toHaveBeenCalledWith("/project-1");
  });

  test("does not create a new project when existing ones exist", async () => {
    mockSignIn.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signIn("a@b.com", "pass");
    });

    expect(mockCreateProject).not.toHaveBeenCalled();
  });
});

describe("post-sign-in navigation — no anonymous work, no existing projects", () => {
  beforeEach(() => {
    mockGetAnonWorkData.mockReturnValue(null);
    mockGetProjects.mockResolvedValue([]);
    mockCreateProject.mockResolvedValue({ id: "fresh-project-id" });
  });

  test("creates a new empty project and navigates to it", async () => {
    mockSignIn.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signIn("a@b.com", "pass");
    });

    expect(mockCreateProject).toHaveBeenCalledWith(
      expect.objectContaining({ messages: [], data: {} })
    );
    expect(mockPush).toHaveBeenCalledWith("/fresh-project-id");
  });
});

describe("post-sign-in navigation — anonymous work with empty messages", () => {
  test("does not treat zero-message anon work as real work", async () => {
    mockGetAnonWorkData.mockReturnValue({ messages: [], fileSystemData: {} });
    mockGetProjects.mockResolvedValue([{ id: "existing-id" }]);
    mockSignIn.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signIn("a@b.com", "pass");
    });

    // Should fall through to getProjects path, not create a project from anon data
    expect(mockPush).toHaveBeenCalledWith("/existing-id");
  });
});
