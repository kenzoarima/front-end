While you were waiting for the loading screen to complete, Instruqt was deploying the environment used in this workshop on the Linux VM you are accessing via this page.

This is what Instruqt did:
- Installed Docker, Skaffold, and Git.
- Deployed Kubernetes and Docker.
- Cloned the Github repo needed for this workshop

***

Now that the deployment has been completed, you must run the following commands to validate that all the required modules are running properly:
- Run `ls` to see all available folders.
- Run `kubectl get pods --all-namespaces` to see the pods deployed by K3S.
- Run `which skaffold` to see if the Skaffold development framework is available.
- Run `which k6` to see if the k6 load testing framework is available.

***

# A) Setting up the Sock Shop microservices

A1. Click on the **VSCode** tab, and on the left side panel, click on **kubernetes-manifests > complete-demo-nrsg.yml**

A2. Retrieve the license keys, account ids and app ids which you have gathered in the previous step, and replace the `<<>>` with the correspondingly values.

A3. Click on **Terminal 1**, and run this command
```bash
kubectl apply -f kubernetes-manifests/complete-demo-nrsg.yml --namespace=sock-shop
```

A4. You will see that the applications and services are being deployed to Kubernetes. We will wait for the applications to stabilise. Run this command to look at the status of the Kubernetes pods.
```bash
k get pods -n sock-shop -w
```

A5. When all the pods have reached the 1/1 or 2/2 states, you can press **Ctrl-C** to exit out of the watching state.

***

# B) Installing New Relic Kubernetes monitoring

B1. Navigate to one.newrelic.com portal, and click on **Add Data**.

B2. In the search bar, search for **Kubernetes**.

B3. Click on **Kubernetes > Kubernetes & containers**.

B4. Ensure the correct New Relic account id is indicated in the "We'll send your data to this account" field.

B5. For "Cluster name", fill in with **sock-shop-cluster** .

B6. For "Namespace for the integration", we can keep it as **newrelic** .

B7. Click on "Continue".

B8. Ensure that the following options are checked:
- Gather Log data
- Instant service-level insights
- Reduce the amount of ingested data

B9. Click on "Continue".

B10. Select **Helm 3** under "Choose install method". Use the **Copy command** to copy the codes.

B11. The codes you copied should look similar to this:
```bash
helm repo add newrelic https://helm-charts.newrelic.com && helm repo update && \
kubectl create namespace newrelic ; helm upgrade --install newrelic-bundle newrelic/nri-bundle \
 --set global.licenseKey=xxxxx \
 --set global.cluster=sock-shop-cluster \
 --namespace=newrelic \
 --set newrelic-infrastructure.privileged=true \
 --set global.lowDataMode=true \
 --set ksm.enabled=true \
 --set kubeEvents.enabled=true \
 --set prometheus.enabled=true \
 --set logging.enabled=true \
 --set newrelic-pixie.enabled=true \
 --set newrelic-pixie.apiKey=px-api-xxxxx \
 --set pixie-chart.enabled=true \
 --set pixie-chart.deployKey=px-dep-xxxxx \
 --set pixie-chart.clusterName=sock-shop-cluster
```

B12. Paste the codes and press Enter. We will wait for the newrelic related pods to stabilise. Run this command to look at the status of the Kubernetes pods.
```
k get pods -n newrelic -w
```

B13. When the pods have stabilised, press **Ctrl-C** to escape from the watch state. Run this command to update the environment variable of the Daemonset **newrelic-bundle-newrelic-logging**.
```bash
kubectl set env DaemonSet/newrelic-bundle-newrelic-logging LOG_PARSER=cri --namespace=newrelic
```

B14. Run this command to restart the DaemonSet.
```bash
kubectl rollout restart DaemonSet newrelic-bundle-newrelic-logging -n newrelic
```

***

# C) Visit the Sock Shop website

C1. Click on the **Website** tab, and that will open a new tab displaying the e-commerce front end website. Try clicking around, browse the items in the catalogue and add them into your cart.

C2. Simulate registering as 2-3 users and repeat step C1. This is to facilitate the upcoming tasks.

C3. After browsing around the website, navigate to your one.newrelic.com portal and check that data has been ingested. You should see:

- APMs: sock-shop-frontend, sock-shop-orders, sock-shop-shipping
- Kubernetes: sock-shop-cluster
- Browser: sock-shop-frontend

***

# D) Simulate traffic visiting the Sock Shop website

D1. Click on **Terminal 1**, and ensure that your terminal is in the **frontend** folder.

D2. Run this command. Note down the **External-IP** address of the **frontend** service.
```bash
k get svc -n sock-shop
```

D3. Replace the `<<ip-address>>` and run this command:
```
k6 run -e PUBLIC_IP=<<ip-address>> k6/loadtest.js
```

D4. Observe the output of the k6 load testing process.

***

# E) Run Skaffold to kickstart on-the-fly development.

E1. Click on **Terminal 2**, and ensure that your terminal is in the **frontend** folder.

E2. Run this command:
```
skaffold dev
```

E3. Observe Skaffold building a new Docker image based on what is declared in the **skaffold.yml** file, and wait for it to deploy the application pod to stabilise.

E4. Click on the **VSCode** tab, and on the left side panel, click on **public > navbar.html** and make some changes to the file. After that, click on the save icon on the file tab.

E5. Navigate to **Terminal 2**, and observe Skaffold re-building the image and re-deploying the application.

E6. When the re-build is done, you can navigate to the **Website** tab, refresh the page and you can see the updated navbar.

***

# F) Gain Insights from New Relic Dashboards.

![New Relic Marketplace Dashboards](https://raw.githubusercontent.com/kenzoarima/front-end/step-6-NR-skaffold-test/docs/nr-marketplace-dashboards.png)

F1. A key component of New Relic is allowing users to customise the dashboards and visualise the important information they want to see. We have many quickstart templates for you to choose from as we can see in the above screenshot. In this case we will search for **Customer experience bottom of the funnel analysis**  . Click on it to install the dashboard. You will see something like below.

![Customer Experience Dashboard](https://raw.githubusercontent.com/kenzoarima/front-end/step-6-NR-skaffold-test/docs/sock-shop-bofa.png)

F2. Let's update the Funnel visualisation with this NRQL:
```
FROM Transaction SELECT funnel(customerId, WHERE action LIKE 'view_catalogue' OR action LIKE 'view_catalogue_tags' AS 'Browser Items', WHERE action LIKE 'cart_add' AS 'Add to Cart', WHERE action LIKE 'cart_update' AS 'Update Cart', WHERE action LIKE 'cart_purchased' AS 'Purchased') WHERE appName = 'sock-shop-frontend' AND action IS NOT NULL LIMIT MAX
```

You should now be able to see a nice funnel tapering downwards, showing you the customer conversion on the e-commerce website. This is based on the user actions that you have done earlier in step C.

***

# G) Implement custom events and custom attributes.
G1. Click on the **VSCode** tab, and on the left side panel, click on **api > cart > index.js**

G2. Search for `newrelic.addCustomAttributes` . This is how you can easily add custom attributes to your transactions to enrich them with the data you need.

G3. Let's add an additional key/value pair into the existing custom attributes: `"enduser.id": custIdKen,` , the final codes should look very similar to:
```
newrelic.addCustomAttributes({
  "customerId": custIdKen,
  "enduser.id": custIdKen,
  "action": "cart_add",
  "item_id": req.body.id,
  "item_quantity": 1
});
```

G4. Do the same for the other areas in the code that we have added Custom Attributes. Finally, remember to save the file.

G5. Navigate to **Terminal 2**, and observe Skaffold re-building the image and re-deploying the application.

***

# H) Fix the error indicated in Errors Inbox.
H1. Check that the Load Test Simulator is still running in Step D. If not, re-run the `k6 run ...` command.

H2. Navigate to APM > sock-shop-frontend > Errors inbox , you should see something like this:

![Errors Inbox](https://raw.githubusercontent.com/kenzoarima/front-end/step-6-NR-skaffold-test/docs/sock-shop-errrosinbox.png)

H3. Navigate through to solve the bug!

***