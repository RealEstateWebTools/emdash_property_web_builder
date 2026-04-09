# Visual Architecture: Request Flow

This document visualizes how a request travels through the managed hosting infrastructure.

```mermaid
graph TD
    User([End User]) --> |1. HTTPS Request| Edge[Cloudflare Edge]
    Edge --> Dispatcher{Dispatcher Worker}
    
    subgraph Control_Plane [Control Plane]
        Admin[Admin Dashboard]
        Auth[Auth Service]
        Billing[Billing / Polar]
        Prov[Provisioning Logic]
    end
    
    Admin --> |Trigger| Prov
    Prov --> |API Call| CloudflareAPI[Cloudflare API]
    
    CloudflareAPI --> |Create| D1[(Site D1 SQL)]
    CloudflareAPI --> |Create| R2[Site R2 Media]
    CloudflareAPI --> |Deploy| Namespace[Dispatch Namespace]
    
    Dispatcher --> |2. Lookup Host| KV[(Routing KV)]
    Dispatcher --> |3. Dynamic Fetch| Namespace
    
    Namespace --> |4. Execution| D1
    Namespace --> |5. Asset Load| R2
    
    TenantAdmin([Tenant Manager]) --> |Manage| Admin
```

## Detailed Flow Steps

1. **Traffic Entry**: A request hits Cloudflare for `myblog.emdash.io`.
2. **Global Dispatcher**: The primary Worker (Dispatcher) intercepts the request.
3. **Routing Metadata**: The Dispatcher queries KV (Key-Value) storage to resolve the `Host` to a specific internal `script_id`.
4. **Namespace Execution**: The Dispatcher uses Workers for Platforms to call the specific script.
5. **Data Access**: The isolated script executes, connecting to its specific D1 SQL database for content and R2 bucket for images.
6. **Response**: The final HTML/Asset is returned to the user with ultra-low latency.
