import { ArrowLeft, Car } from "lucide-react";
import { useState } from "react";
import type { Session } from "../App";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { getParkingState } from "../lib/parkingStore";

interface Props {
  onLogin: (s: Session) => void;
  onBack: () => void;
}

export default function LoginPage({ onLogin, onBack }: Props) {
  const [adminUser, setAdminUser] = useState("");
  const [adminPass, setAdminPass] = useState("");
  const [adminError, setAdminError] = useState("");
  const [userName, setUserName] = useState("");
  const [carNumber, setCarNumber] = useState("");
  const [userError, setUserError] = useState("");

  const handleAdminLogin = () => {
    const state = getParkingState();
    if (adminUser === "admin" && adminPass === state.adminPassword) {
      onLogin({ role: "admin", username: "admin" });
    } else if (adminUser === "Amol4383" && adminPass === "Amol@4383") {
      onLogin({ role: "admin", username: "Amol4383" });
    } else {
      setAdminError("Invalid username or password.");
    }
  };

  const handleUserLogin = () => {
    if (!userName.trim() || !carNumber.trim()) {
      setUserError("Please enter both name and car number.");
      return;
    }
    onLogin({
      role: "user",
      name: userName.trim(),
      carNumber: carNumber.trim().toUpperCase(),
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            type="button"
            onClick={onBack}
            className="text-gray-500 hover:text-gray-800 flex items-center gap-1 text-sm"
          >
            <ArrowLeft size={16} /> Back
          </button>
          <div className="flex items-center gap-2">
            <Car className="text-blue-600" size={24} />
            <span className="font-bold text-gray-900">SmartPark</span>
          </div>
        </div>
      </header>
      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader>
            <CardTitle className="text-center text-2xl">
              Welcome to SmartPark
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="user">
              <TabsList className="w-full mb-6">
                <TabsTrigger value="user" className="flex-1">
                  User Login
                </TabsTrigger>
                <TabsTrigger value="admin" className="flex-1">
                  Admin Login
                </TabsTrigger>
              </TabsList>
              <TabsContent value="user">
                <div className="space-y-4">
                  <div>
                    <Label>Your Name</Label>
                    <Input
                      placeholder="e.g. Raj Kumar"
                      value={userName}
                      onChange={(e) => {
                        setUserName(e.target.value);
                        setUserError("");
                      }}
                    />
                  </div>
                  <div>
                    <Label>Car Number</Label>
                    <Input
                      placeholder="e.g. MH12AB1234"
                      value={carNumber}
                      onChange={(e) => {
                        setCarNumber(e.target.value);
                        setUserError("");
                      }}
                    />
                  </div>
                  {userError && (
                    <p className="text-red-500 text-sm">{userError}</p>
                  )}
                  <Button
                    type="button"
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    onClick={handleUserLogin}
                  >
                    Enter
                  </Button>
                </div>
              </TabsContent>
              <TabsContent value="admin">
                <div className="space-y-4">
                  <div>
                    <Label>Username</Label>
                    <Input
                      placeholder="Admin username"
                      value={adminUser}
                      onChange={(e) => {
                        setAdminUser(e.target.value);
                        setAdminError("");
                      }}
                    />
                  </div>
                  <div>
                    <Label>Password</Label>
                    <Input
                      type="password"
                      placeholder="Password"
                      value={adminPass}
                      onChange={(e) => {
                        setAdminPass(e.target.value);
                        setAdminError("");
                      }}
                      onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()}
                    />
                  </div>
                  {adminError && (
                    <p className="text-red-500 text-sm">{adminError}</p>
                  )}
                  <Button
                    type="button"
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    onClick={handleAdminLogin}
                  >
                    Login
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
