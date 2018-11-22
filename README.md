# Very Complex Fibonacci Calculator

> Overcomplecated Fibanacci calculator implementation.

This will allow me to register an scafolding template for Kubernetes Cluster configuration

## Cluster Architecture

![Architecture Diagram](./fib_calculator_architecture.png)

<br />

## Applying Cluster Configuration

```shell
# At repository root
$ kubectl apply -f k8s
```

<br />

## Deleting Cluster Configuration

```shell
# At repository root
$ kubectl delete -f k8s
```

<br />

## Adding Secret Objects for password and encrypted data

```shell
$ kubectl create secret generic postgres-password --from-literal=POSTGRES_PASSWORD=pgpass123
```
