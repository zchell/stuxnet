import { useState, useEffect, useRef } from "react";
import { EmailForm } from "@/components/EmailForm";
import { EmailHistory } from "@/components/EmailHistory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const AUTH_STORAGE_KEY = "cmcar-authenticated";
const USERNAME = import.meta.env.VITE_AUTH_USERNAME || "admin";
const PASSWORD = import.meta.env.VITE_AUTH_PASSWORD || "admin";

const Index = () => {
  const [authenticated, setAuthenticated] = useState(false);
  const [formState, setFormState] = useState({ username: "", password: "" });
  const [submitting, setSubmitting] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (stored === "true") {
      setAuthenticated(true);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    setTimeout(() => {
      if (
        formState.username.trim() === USERNAME &&
        formState.password === PASSWORD
      ) {
        setAuthenticated(true);
        localStorage.setItem(AUTH_STORAGE_KEY, "true");
        toast.success("Login successful");
      } else {
        toast.error("Invalid credentials", {
          description: "Please check the username and password",
        });
      }
      setSubmitting(false);
    }, 400);
  };


                return (
                  <div className="relative min-h-screen">
                    {/* Background video (shows on login screen only). When authenticated we show a static background image instead. */}
                    <video
                      ref={videoRef}
                      className="absolute inset-0 w-full h-full object-cover z-0"
                      poster="/login-bg.jpg"
                      src="/login-video.mp4"
                      autoPlay
                      muted={isMuted}
                      loop
                      playsInline
                    />
                <div className="absolute inset-0 bg-black/40 z-10" />

                    {/* Speaker toggle (visible to allow user to enable sound) */}
                    <button
                      onClick={() => {
                        if (videoRef.current) {
                          const next = !isMuted;
                          videoRef.current.muted = next;
                          if (!next) {
                            videoRef.current.play().catch(() => {
                              toast.info('Click the video to enable sound');
                            });
                          }
                          setIsMuted(next);
                        }
                      }}
                      aria-label={isMuted ? 'Unmute background video' : 'Mute background video'}
                      className="fixed top-4 right-4 z-30 bg-black/50 text-white px-3 py-2 rounded"
                      data-testid="button-sound-toggle"
                    >
                      {isMuted ? 'Sound Off' : 'Sound On'}
                    </button>

                    <div className="min-h-screen flex items-center justify-center px-4 relative z-20">
                      {!authenticated ? (
                        <Card className="w-full max-w-sm relative z-20">
                          <CardHeader>
                            <CardTitle className="text-center">Secure Access</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <form className="space-y-4" onSubmit={handleLogin}>
                              <div className="space-y-2">
                                <Input
                                  id="username"
                                  placeholder="Username"
                                  value={formState.username}
                                  onChange={(e) =>
                                    setFormState({ ...formState, username: e.target.value })
                                  }
                                  required
                                  disabled={submitting}
                                  data-testid="input-username"
                                />
                              </div>
                              <div className="space-y-2">
                                <Input
                                  id="password"
                                  type="password"
                                  placeholder="Password"
                                  value={formState.password}
                                  onChange={(e) =>
                                    setFormState({ ...formState, password: e.target.value })
                                  }
                                  required
                                  disabled={submitting}
                                  data-testid="input-password"
                                />
                              </div>
                              <Button type="submit" className="w-full" disabled={submitting} data-testid="button-login">
                                {submitting ? "Authenticating..." : "Enter Dashboard"}
                              </Button>
                            </form>
                          </CardContent>
                        </Card>
                      ) : (
                        <div
                          className="min-h-screen py-12 px-4 w-full"
                          style={{
                            backgroundImage: "url('/main-bg.jpg')",
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                          }}
                        >
                          <div className="container mx-auto max-w-6xl bg-transparent">
                            <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-12">
                              <div className="space-y-4 max-w-3xl">
                                <h1 className="text-4xl md:text-5xl font-bold text-white" data-testid="text-dashboard-title">
                                  CMCAR Email Manager
                                </h1>
                                <p className="text-lg text-white/80">
                                  Send personalized HTML emails with template variables, preview instantly, and
                                  track your sending history.
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                onClick={() => {
                                  localStorage.removeItem(AUTH_STORAGE_KEY);
                                  setAuthenticated(false);
                                  toast.info("Logged out");
                                }}
                                data-testid="button-logout"
                              >
                                Logout
                              </Button>
                            </div>

                            <div className="grid lg:grid-cols-2 gap-6 mb-12">
                              <EmailForm />
                              <EmailHistory />
                            </div>
                            <div className="mt-12 max-w-3xl mx-auto">
                              <div className="bg-card rounded-lg border p-6 space-y-4" data-testid="section-tips">
                                <h2 className="text-xl font-semibold">Tips for Best Inbox Delivery</h2>
                                <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5">
                                  <li>Use proper HTML structure with semantic tags</li>
                                  <li>Include both text and HTML versions when possible</li>
                                  <li>Avoid spam trigger words and excessive capitalization</li>
                                  <li>Test your emails before sending to large lists</li>
                                  <li>Use a verified domain for the "from" address</li>
                                </ul>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );

};

export default Index;
