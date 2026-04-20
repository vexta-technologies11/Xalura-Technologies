import type { Employee } from "@/types/employee";
import { AgentCard } from "./AgentCard";

export function AIEmployees({ employees }: { employees: Employee[] }) {
  return (
    <section className="wrap" id="ai-employees">
      <p className="label r">The Team</p>
      <h2 className="h2 r" style={{ transitionDelay: "0.1s" }}>
        Meet the people
        <br />
        <em>keeping things moving.</em>
      </h2>
      <p
        className="body-text r"
        style={{
          transitionDelay: "0.15s",
          marginTop: 16,
          marginBottom: 48,
        }}
      >
        Every person on a growing team has a role. Ours just happen to run on
        code. Our AI team members each have a clear job, a consistent work
        ethic, and they show up every single day without being asked. They do
        not call in sick. They do not get overwhelmed. And they genuinely make
        life easier for everyone around them.
      </p>
      <div className="pillars r" style={{ transitionDelay: "0.2s" }}>
        {employees.map((e) => (
          <AgentCard key={e.id} employee={e} />
        ))}
      </div>
    </section>
  );
}
