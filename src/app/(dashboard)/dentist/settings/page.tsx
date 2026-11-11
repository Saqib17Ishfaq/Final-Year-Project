"use client"

import { useState } from "react"
import { User, Play } from "lucide-react"
import { getStoredUser, StoredUser } from "@/lib/user-storage"
import ProfilePictureUpload from "@/components/shared/profile-picture-upload"
import { replayTour } from "@/components/features/onboarding/onboarding-tour"
import { TOUR_STORAGE_KEY } from "@/lib/onboarding-tour"

import { toast } from "sonner"

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("profile")
  const [currentUser] = useState<StoredUser>(() => getStoredUser())

  const [oldPassword, setOldPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordSaving, setPasswordSaving] = useState(false)

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match")
      return
    }
    
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/
    if (!strongPasswordRegex.test(newPassword)) {
      toast.error("Password must be at least 8 characters and include uppercase, lowercase, number, and special character")
      return
    }
    
    if (!currentUser?.id) {
      toast.error("User not found")
      return
    }

    setPasswordSaving(true)
    try {
      const res = await fetch(`/api/users/${currentUser.id}/password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword, newPassword })
      })
      
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to change password")
      }
      
      toast.success("Password changed successfully")
      setOldPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (error: any) {
      toast.error(error.message || "An error occurred")
    } finally {
      setPasswordSaving(false)
    }
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case "profile":
        return (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
               <h3 className="text-lg font-medium text-foreground">Profile Settings</h3>
               <p className="text-sm text-muted-foreground">Manage your personal profile and preferences.</p>
            </div>
            
            {currentUser?.id ? (
              <div className="flex flex-col sm:flex-row gap-8 mt-6">
                <div className="flex-shrink-0">
                  <ProfilePictureUpload 
                    userId={currentUser.id}
                    currentImage={currentUser.image}
                    initials={currentUser.name ? currentUser.name.slice(0, 2).toUpperCase() : "U"}
                    size="lg"
                  />
                </div>
                <div className="space-y-4 flex-1">
                  <div>
                    <label className="text-sm font-medium text-foreground">Name</label>
                    <p className="mt-1 text-sm text-foreground bg-muted/50 p-2 rounded border border-border/50">{currentUser.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">Email</label>
                    <p className="mt-1 text-sm text-foreground bg-muted/50 p-2 rounded border border-border/50">{currentUser.email}</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Loading user data...</p>
            )}

            {currentUser?.id && (
              <div className="mt-10 pt-6 border-t border-border">
                <h3 className="text-lg font-medium text-foreground mb-4">Change Password</h3>
                <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-1">Old Password</label>
                    <input 
                      type="password" 
                      value={oldPassword}
                      onChange={e => setOldPassword(e.target.value)}
                      required
                      className="w-full px-3 py-2 border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-1">New Password</label>
                    <input 
                      type="password" 
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      required
                      minLength={8}
                      title="At least 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special character"
                      className="w-full px-3 py-2 border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-1">Confirm New Password</label>
                    <input 
                      type="password" 
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      required
                      minLength={8}
                      className="w-full px-3 py-2 border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <button 
                    type="submit" 
                    disabled={passwordSaving}
                    className="px-4 py-2 bg-primary text-white text-sm font-medium rounded hover:opacity-90 disabled:opacity-60 transition-opacity"
                  >
                    {passwordSaving ? "Changing..." : "Change Password"}
                  </button>
                </form>
              </div>
            )}
          </div>
        )
      case "tour":
        return (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h3 className="text-lg font-medium text-foreground">Guided Tour</h3>
              <p className="text-sm text-muted-foreground">Re-run the onboarding walkthrough to familiarize yourself with the dashboard.</p>
            </div>
            <button
              onClick={() => {
                localStorage.removeItem(`${TOUR_STORAGE_KEY}_dentist`)
                replayTour('dentist')
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-primary hover:opacity-90 transition-opacity"
            >
              <Play className="w-4 h-4" />
              Replay Onboarding Tour
            </button>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-8">
         <nav className="w-full md:w-64 flex-shrink-0 space-y-1">
            <button 
               onClick={() => setActiveTab("profile")}
               className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'profile' ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'}`}
            >
               <User className="w-4 h-4" />
               Profile
            </button>
            <button 
               onClick={() => setActiveTab("tour")}
               className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'tour' ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'}`}
            >
               <Play className="w-4 h-4" />
               Guided Tour
            </button>
         </nav>

         <div className="flex-1 min-w-0 bg-card rounded-xl border shadow-sm p-6">
            {renderTabContent()}
         </div>
      </div>
    </div>
  );
}