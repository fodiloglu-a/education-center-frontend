// Bu dosya, üretim ortamı için varsayılan yapılandırma ayarlarını içerir.
// 'ng build --configuration=production' veya 'ng build' komutlarıyla derlendiğinde kullanılır.
export const environment = {
  production: true, // Üretim ortamı olduğunu belirtir
  apiUrl: 'http://localhost:8080/api' // Backend API'sinin üretim URL'si (şimdilik localhost)
};
