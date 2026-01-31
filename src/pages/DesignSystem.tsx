import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Badge } from "../components/ui/Badge";
import { Skeleton } from "../components/ui/Skeleton";
import { Search, Mail, Bell } from "lucide-react";

export default function DesignSystem() {
    return (
        <div className="min-h-screen p-8 bg-[#F2F1EA] space-y-12">
            <div className="max-w-4xl mx-auto space-y-12">

                <div>
                    <h1 className="text-4xl font-light text-[#1A1A1A] mb-2">Design System</h1>
                    <p className="text-[#666]">Component verification and showcase</p>
                </div>

                {/* Buttons */}
                <section className="space-y-4">
                    <h2 className="text-2xl font-medium text-[#1A1A1A]">Buttons</h2>
                    <Card className="flex flex-wrap gap-4 items-center">
                        <Button variant="primary">Primary Button</Button>
                        <Button variant="accent">Accent Button</Button>
                        <Button variant="secondary">Secondary Button</Button>
                        <Button variant="outline">Outline Button</Button>
                        <Button variant="ghost">Ghost Button</Button>
                        <Button variant="link">Link Button</Button>
                        <Button size="icon" variant="secondary"><Bell size={18} /></Button>
                        <Button isLoading>Loading</Button>
                    </Card>
                </section>

                {/* Cards */}
                <section className="space-y-4">
                    <h2 className="text-2xl font-medium text-[#1A1A1A]">Cards</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                            <h3 className="font-semibold text-lg mb-2">Default Card</h3>
                            <p className="text-[#666]">Standard card with rounded-3xl and padding.</p>
                        </Card>
                        <Card variant="dark">
                            <h3 className="font-semibold text-lg mb-2">Dark Card</h3>
                            <p className="text-white/60">Used for emphasis or contrast sections.</p>
                        </Card>
                        <Card variant="small">
                            <h3 className="font-semibold text-base mb-2">Small Card</h3>
                            <p className="text-[#666] text-sm">Tighter padding and radius.</p>
                        </Card>
                        <Card variant="flat" className="bg-transparent">
                            <h3 className="font-semibold text-lg mb-2">Flat Card</h3>
                            <p className="text-[#666]">No shadow or background (transparent).</p>
                        </Card>
                    </div>
                </section>

                {/* Inputs */}
                <section className="space-y-4">
                    <h2 className="text-2xl font-medium text-[#1A1A1A]">Inputs</h2>
                    <Card className="grid gap-6 max-w-lg">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[#1A1A1A]">Default Input</label>
                            <Input placeholder="Enter text..." />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[#1A1A1A]">Input with Icon</label>
                            <Input icon={<Search />} placeholder="Search..." />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[#1A1A1A]">Email Input</label>
                            <Input icon={<Mail />} type="email" placeholder="user@example.com" />
                        </div>
                    </Card>
                </section>

                {/* Badges */}
                <section className="space-y-4">
                    <h2 className="text-2xl font-medium text-[#1A1A1A]">Badges</h2>
                    <Card className="flex flex-wrap gap-4">
                        <Badge variant="default">Default</Badge>
                        <Badge variant="secondary">Secondary</Badge>
                        <Badge variant="outline">Outline</Badge>
                        <Badge variant="success">Success</Badge>
                        <Badge variant="warning">Warning</Badge>
                        <Badge variant="destructive">Destructive</Badge>
                    </Card>
                </section>

                {/* Skeletons */}
                <section className="space-y-4">
                    <h2 className="text-2xl font-medium text-[#1A1A1A]">Loading State</h2>
                    <Card className="space-y-4">
                        <div className="flex items-center space-x-4">
                            <Skeleton className="h-12 w-12 rounded-full" />
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-[250px]" />
                                <Skeleton className="h-4 w-[200px]" />
                            </div>
                        </div>
                        <Skeleton className="h-[125px] w-full rounded-xl" />
                    </Card>
                </section>

            </div>
        </div>
    );
}
