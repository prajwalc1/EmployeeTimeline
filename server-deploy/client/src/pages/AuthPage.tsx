import { useState } from "react";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DEPARTMENTS } from "@/lib/constants";
import { useUser } from "@/hooks/use-user";

type LoginForm = {
  username: string;
  password: string;
};

type RegisterForm = LoginForm & {
  name: string;
};

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const { login, register } = useUser();
  
  const loginForm = useForm<LoginForm>();
  const registerForm = useForm<RegisterForm>();

  const handleLoginSubmit = (data: LoginForm) => {
    login(data);
  };

  const handleRegisterSubmit = (data: RegisterForm) => {
    register(data);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <CardTitle>{isLogin ? "Anmeldung" : "Registrierung"}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLogin ? (
            <form onSubmit={loginForm.handleSubmit(handleLoginSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Benutzername</Label>
                <Input id="username" {...loginForm.register("username")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Passwort</Label>
                <Input id="password" type="password" {...loginForm.register("password")} />
              </div>
              <Button type="submit" className="w-full">Anmelden</Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setIsLogin(false)}
              >
                Neuen Account erstellen
              </Button>
            </form>
          ) : (
            <form onSubmit={registerForm.handleSubmit(handleRegisterSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" {...registerForm.register("name")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">Benutzername</Label>
                <Input id="username" {...registerForm.register("username")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Passwort</Label>
                <Input id="password" type="password" {...registerForm.register("password")} />
              </div>
              <Button type="submit" className="w-full">Registrieren</Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setIsLogin(true)}
              >
                Zurück zur Anmeldung
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
