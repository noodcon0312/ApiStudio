import React, { useState, useRef, useEffect } from 'react';
import JSZip from 'jszip';
import { Send, Code2, Play, Download, Maximize2, Minimize2, Settings2, Sparkles, AlertCircle, Plus, Trash2, Undo2, X, Moon, Sun, Folder, Paperclip, ImageIcon, Music, Eye, ShieldCheck, Square, Sliders, Code, FileCode, FileJson, FileText, File, Check, PenTool, ChevronDown, ChevronRight, Brain } from 'lucide-react';
import { Message, TabState, Project, Theme, InstructionRule } from './types';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function extractHtmlBlock(text: string): string | null {
  if (!text) return null;
  
  // Helper to clean nested markdown formatting blocks
  const cleanFences = (code: string): string => {
    let cleaned = code.trim();
    while (true) {
      let changed = false;
      const startMatch = cleaned.match(/^\s*```[a-zA-Z0-9+#-]*[\r\n]*/i);
      if (startMatch) {
        cleaned = cleaned.substring(startMatch[0].length).trim();
        changed = true;
      }
      const endMatch = cleaned.match(/[\r\n]*```\s*$/);
      if (endMatch) {
        cleaned = cleaned.substring(0, cleaned.length - endMatch[0].length).trim();
        changed = true;
      }
      if (!changed) break;
    }
    return cleaned;
  };

  // 1. Try to find the start of ```html
  const htmlStartIdx = text.toLowerCase().indexOf("```html");
  if (htmlStartIdx !== -1) {
    // Find the newline after ```html
    const afterTag = text.substring(htmlStartIdx + 7);
    const firstNewline = afterTag.search(/[\r\n]/);
    let startContentIdx = htmlStartIdx + 7;
    if (firstNewline !== -1) {
      startContentIdx = htmlStartIdx + 7 + firstNewline + 1;
    }
    
    // Find closing ``` after the start of content
    const contentSub = text.substring(startContentIdx);
    let closingIdx = contentSub.indexOf("```");
    if (closingIdx === 0 || (closingIdx !== -1 && /^\s*```[a-zA-Z0-9+#-]/i.test(contentSub.substring(closingIdx)))) {
      closingIdx = contentSub.lastIndexOf("```");
    }
    let code = closingIdx !== -1 ? contentSub.substring(0, closingIdx).trim() : contentSub.trim();
    
    // Handle unclosed tags for truncated output
    const lowerCode = code.toLowerCase();
    if (lowerCode.includes("<script") && !lowerCode.includes("</script>")) {
      code += "\n</script>\n</body>\n</html>";
    } else if (lowerCode.includes("<html") && !lowerCode.includes("</html>")) {
      code += "\n</body>\n</html>";
    }
    return cleanFences(code);
  }
  
  // 2. Try generic ``` start if there is no ```html, but there is ```
  const genericStartIdx = text.indexOf("```");
  if (genericStartIdx !== -1) {
    const afterTag = text.substring(genericStartIdx + 3);
    const firstNewline = afterTag.search(/[\r\n]/);
    let startContentIdx = genericStartIdx + 3;
    if (firstNewline !== -1) {
      startContentIdx = genericStartIdx + 3 + firstNewline + 1;
    }
    const contentSub = text.substring(startContentIdx);
    const closingIdx = contentSub.indexOf("```");
    let codeContent = closingIdx !== -1 ? contentSub.substring(0, closingIdx).trim() : contentSub.trim();
    
    if (codeContent.toLowerCase().includes("<html") || codeContent.toLowerCase().includes("<!doctype") || codeContent.toLowerCase().includes("<body") || codeContent.toLowerCase().includes("<script")) {
      const lowerCode = codeContent.toLowerCase();
      if (lowerCode.includes("<script") && !lowerCode.includes("</script>")) {
        codeContent += "\n</script>\n</body>\n</html>";
      } else if (lowerCode.includes("<html") && !lowerCode.includes("</html>")) {
        codeContent += "\n</body>\n</html>";
      }
      return cleanFences(codeContent);
    }
  }
  
  // 3. Fallback: if no markdown backticks, but contains html-like markers
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();
  if (lower.startsWith("<!doctype") || lower.includes("<html") || lower.includes("<body") || lower.includes("<script") || lower.includes("css") || lower.includes("canvas")) {
    let code = trimmed;
    if (lower.includes("<script") && !lower.includes("</script>")) {
      code += "\n</script>\n</body>\n</html>";
    } else if (lower.includes("<html") && !lower.includes("</html>")) {
      code += "\n</body>\n</html>";
    }
    return cleanFences(code);
  }
  
  return null;
}

const PYTHON_LIBRARIES_DB = [
  // 1. Core & Tiện ích Hệ thống (System & Utilities)
  { name: 'six', size: 1, desc: 'Thư viện tương thích giữa Python 2 và Python 3.', category: '1. Core & Tiện ích Hệ thống (System & Utilities)' },
  { name: 'pip', size: 4, desc: 'Trình quản lý gói cài đặt mặc định của Python.', category: '1. Core & Tiện ích Hệ thống (System & Utilities)' },
  { name: 'setuptools', size: 3, desc: 'Công cụ đóng gói và phân phối các dự án Python.', category: '1. Core & Tiện ích Hệ thống (System & Utilities)' },
  { name: 'wheel', size: 2, desc: 'Định dạng đóng gói chuẩn giúp cài đặt thư viện nhanh hơn.', category: '1. Core & Tiện ích Hệ thống (System & Utilities)' },
  { name: 'python-dateutil', size: 2, desc: 'Mở rộng module datetime mặc định, xử lý ngày tháng phức tạp.', category: '1. Core & Tiện ích Hệ thống (System & Utilities)' },
  { name: 'pytz', size: 3, desc: 'Quản lý múi giờ toàn cầu chuẩn xác.', category: '1. Core & Tiện ích Hệ thống (System & Utilities)' },
  { name: 'tzdata', size: 5, desc: 'Cung cấp dữ liệu múi giờ IANA cho thư viện chuẩn của Python.', category: '1. Core & Tiện ích Hệ thống (System & Utilities)' },
  { name: 'packaging', size: 1, desc: 'Tiện ích cốt lõi để xử lý phiên bản và phân tích gói phần mềm.', category: '1. Core & Tiện ích Hệ thống (System & Utilities)' },
  { name: 'pathspec', size: 1, desc: 'Tiện ích so khớp đường dẫn file (pattern matching) giống như .gitignore.', category: '1. Core & Tiện ích Hệ thống (System & Utilities)' },
  { name: 'pluggy', size: 1, desc: 'Cơ chế quản lý plugin mạnh mẽ (lõi của pytest).', category: '1. Core & Tiện ích Hệ thống (System & Utilities)' },
  { name: 'platformdirs', size: 1, desc: 'Xác định chính xác thư mục lưu trữ ứng dụng trên các OS khác nhau.', category: '1. Core & Tiện ích Hệ thống (System & Utilities)' },
  { name: 'filelock', size: 1, desc: 'Tạo cơ chế khóa file (file locking) đa nền tảng, tránh xung đột ghi đè.', category: '1. Core & Tiện ích Hệ thống (System & Utilities)' },
  { name: 'distro', size: 1, desc: 'Cung cấp thông tin chi tiết về bản phân phối OS đang chạy (đặc biệt là Linux).', category: '1. Core & Tiện ích Hệ thống (System & Utilities)' },
  { name: 'watchdog', size: 3, desc: 'Giám sát các thay đổi của hệ thống file (thêm, sửa, xóa file) theo thời gian thực.', category: '1. Core & Tiện ích Hệ thống (System & Utilities)' },
  { name: 'sh', size: 2, desc: 'Giúp gọi các lệnh shell hệ thống như các hàm Python thông thường.', category: '1. Core & Tiện ích Hệ thống (System & Utilities)' },

  // 2. Giao thức Mạng & HTTP Clients
  { name: 'urllib3', size: 3, desc: 'HTTP client mạnh mẽ, xử lý luồng (thread-safe), hỗ trợ connection pooling.', category: '2. Giao thức Mạng & HTTP Clients' },
  { name: 'requests', size: 2, desc: 'Thư viện gửi HTTP requests phổ biến và thân thiện nhất với lập trình viên.', category: '2. Giao thức Mạng & HTTP Clients' },
  { name: 'idna', size: 1, desc: 'Hỗ trợ chuyển đổi tên miền quốc tế chứa ký tự đặc biệt (IDNA).', category: '2. Giao thức Mạng & HTTP Clients' },
  { name: 'certifi', size: 1, desc: 'Cung cấp chứng chỉ mã hóa (CA) để xác thực độ an toàn của kết nối SSL/TLS.', category: '2. Giao thức Mạng & HTTP Clients' },
  { name: 'aiohttp', size: 8, desc: 'Thư viện HTTP client/server bất đồng bộ (asynchronous) hiệu năng cao.', category: '2. Giao thức Mạng & HTTP Clients' },
  { name: 'httpx', size: 4, desc: 'HTTP client thế hệ mới hỗ trợ cả đồng bộ và bất đồng bộ, tương thích HTTP/2.', category: '2. Giao thức Mạng & HTTP Clients' },
  { name: 'boto3', size: 12, desc: 'SDK chính thức của Amazon Web Services (AWS) để quản lý cloud service.', category: '2. Giao thức Mạng & HTTP Clients' },
  { name: 'paramiko', size: 5, desc: 'Implement giao thức SSHv2, dùng để điều khiển máy chủ từ xa.', category: '2. Giao thức Mạng & HTTP Clients' },
  { name: 'scp', size: 1, desc: 'Thư viện bổ trợ cho Paramiko để truyền tải file qua giao thức SCP bảo mật.', category: '2. Giao thức Mạng & HTTP Clients' },
  { name: 'beautifulsoup4', size: 2, desc: 'Trích xuất, cào dữ liệu từ các file HTML và XML.', category: '2. Giao thức Mạng & HTTP Clients' },

  // 3. Khoa học Dữ liệu & Tính toán Toán học (Data Science & Math)
  { name: 'numpy', size: 22, desc: 'Thư viện nền tảng cho tính toán đại số tuyến tính, mảng đa chiều hiệu năng cao.', category: '3. Khoa học Dữ liệu & Tính toán Toán học (Data Science & Math)' },
  { name: 'pandas', size: 18, desc: 'Thư viện thao tác, phân tích cấu trúc dữ liệu bảng (DataFrame) mạnh mẽ nhất.', category: '3. Khoa học Dữ liệu & Tính toán Toán học (Data Science & Math)' },
  { name: 'scipy', size: 28, desc: 'Thư viện phục vụ tính toán khoa học, tối ưu hóa, tích phân và thống kê nâng cao.', category: '3. Khoa học Dữ liệu & Tính toán Toán học (Data Science & Math)' },
  { name: 'polars', size: 15, desc: 'Thư viện thao tác dữ liệu siêu nhanh, giải pháp thay thế Pandas viết bằng Rust.', category: '3. Khoa học Dữ liệu & Tính toán Toán học (Data Science & Math)' },
  { name: 'pyarrow', size: 20, desc: 'Cung cấp giao diện Python cho Apache Arrow, tối ưu hóa bộ nhớ cho dữ liệu lớn.', category: '3. Khoa học Dữ liệu & Tính toán Toán học (Data Science & Math)' },
  { name: 'sympy', size: 8, desc: 'Thư viện tính toán toán học biểu thức mang tính biểu tượng (Symbolic math).', category: '3. Khoa học Dữ liệu & Tính toán Toán học (Data Science & Math)' },
  { name: 'duckdb', size: 12, desc: 'Cơ sở dữ liệu phân tích nhúng, cho phép truy vấn dữ liệu dạng bảng bằng SQL cực nhanh.', category: '3. Khoa học Dữ liệu & Tính toán Toán học (Data Science & Math)' },
  { name: 'statsmodels', size: 14, desc: 'Phục vụ ước lượng và kiểm định các mô hình thống kê dữ liệu.', category: '3. Khoa học Dữ liệu & Tính toán Toán học (Data Science & Math)' },
  { name: 'numexpr', size: 4, desc: 'Trình tối ưu hóa giúp tăng tốc các biểu thức toán học trên mảng NumPy.', category: '3. Khoa học Dữ liệu & Tính toán Toán học (Data Science & Math)' },
  { name: 'bottleneck', size: 3, desc: 'Tập hợp các hàm mảng NumPy rút gọn được viết bằng Cython để tăng tốc tối đa.', category: '3. Khoa học Dữ liệu & Tính toán Toán học (Data Science & Math)' },

  // 4. Học máy & Trí tuệ Nhân tạo (Machine Learning & AI)
  { name: 'scikit-learn', size: 20, desc: 'Thư viện học máy cổ điển (phân loại, hồi quy, gom cụm) toàn diện nhất.', category: '4. Học máy & Trí tuệ Nhân tạo (Machine Learning & AI)' },
  { name: 'tensorflow', size: 45, desc: 'Framework học sâu (Deep Learning) mã nguồn mở mạnh mẽ của Google.', category: '4. Học máy & Trí tuệ Nhân tạo (Machine Learning & AI)' },
  { name: 'torch', size: 48, desc: 'Framework học sâu linh hoạt dựa trên đồ thị động, cực kỳ phổ biến trong nghiên cứu AI.', category: '4. Học máy & Trí tuệ Nhân tạo (Machine Learning & AI)' },
  { name: 'keras', size: 10, desc: 'API cấp cao chạy trên TensorFlow giúp xây dựng mạng nơ-ron nhanh chóng.', category: '4. Học máy & Trí tuệ Nhân tạo (Machine Learning & AI)' },
  { name: 'transformers', size: 35, desc: 'Thư viện của Hugging Face cung cấp hàng ngàn mô hình NLP, LLM (BERT, GPT...).', category: '4. Học máy & Trí tuệ Nhân tạo (Machine Learning & AI)' },
  { name: 'xgboost', size: 15, desc: 'Thuật toán cây quyết định tăng cường độ dốc (Gradient Boosting) tối ưu cho thi đấu dữ liệu.', category: '4. Học máy & Trí tuệ Nhân tạo (Machine Learning & AI)' },
  { name: 'lightgbm', size: 12, desc: 'Khung tăng cường độ dốc tốc độ cao, tiêu tốn ít bộ nhớ của Microsoft.', category: '4. Học máy & Trí tuệ Nhân tạo (Machine Learning & AI)' },
  { name: 'h5py', size: 8, desc: 'Giao diện mã hóa để lưu trữ và đọc các tập dữ liệu lớn dưới định dạng file HDF5.', category: '4. Học máy & Trí tuệ Nhân tạo (Machine Learning & AI)' },
  { name: 'optuna', size: 5, desc: 'Khung tối ưu hóa siêu tham số (hyperparameter) tự động cho các mô hình ML.', category: '4. Học máy & Trí tuệ Nhân tạo (Machine Learning & AI)' },
  { name: 'tokenizers', size: 4, desc: 'Thư viện mã hóa văn bản siêu nhanh của Hugging Face phục vụ cho mô hình ngôn ngữ.', category: '4. Học máy & Trí tuệ Nhân tạo (Machine Learning & AI)' },

  // 5. Trực quan hóa Dữ liệu (Data Visualization)
  { name: 'matplotlib', size: 12, desc: 'Thư viện cốt lõi để vẽ đồ thị 2D, biểu đồ tĩnh, động trong Python.', category: '5. Trực quan hóa Dữ liệu (Data Visualization)' },
  { name: 'seaborn', size: 6, desc: 'Xây dựng trên Matplotlib, giúp vẽ biểu đồ thống kê đẹp mắt và trực quan hơn.', category: '5. Trực quan hóa Dữ liệu (Data Visualization)' },
  { name: 'plotly', size: 15, desc: 'Thư viện tạo biểu đồ tương tác, có thể zoom, hover, hiển thị mượt mà trên web.', category: '5. Trực quan hóa Dữ liệu (Data Visualization)' },
  { name: 'bokeh', size: 10, desc: 'Tạo các đồ thị tương tác cao nhắm vào các trình duyệt web hiện đại.', category: '5. Trực quan hóa Dữ liệu (Data Visualization)' },
  { name: 'altair', size: 5, desc: 'Thư viện trực quan hóa khai báo (declarative) dựa trên Vega và Vega-Lite.', category: '5. Trực quan hóa Dữ liệu (Data Visualization)' },

  // 6. Định dạng Dữ liệu & Mã hóa (Data Formats & Serialization)
  { name: 'pyyaml', size: 2, desc: 'Trình phân tích và kết xuất định dạng cấu hình YAML.', category: '6. Định dạng Dữ liệu & Mã hóa (Data Formats & Serialization)' },
  { name: 'toml', size: 1, desc: 'Đọc/ghi các file cấu hình định dạng TOML.', category: '6. Định dạng Dữ liệu & Mã hóa (Data Formats & Serialization)' },
  { name: 'pydantic', size: 5, desc: 'Thư viện kiểm định dữ liệu (data validation) dựa trên Python Type Hints.', category: '6. Định dạng Dữ liệu & Mã hóa (Data Formats & Serialization)' },
  { name: 'simplejson', size: 1, desc: 'Trình mã hóa/giải mã JSON nhanh, liên tục cập nhật hơn module mặc định.', category: '6. Định dạng Dữ liệu & Mã hóa (Data Formats & Serialization)' },
  { name: 'msgpack', size: 1, desc: 'Định dạng trao đổi dữ liệu nhị phân hiệu quả, nhanh và nhỏ hơn JSON.', category: '6. Định dạng Dữ liệu & Mã hóa (Data Formats & Serialization)' },
  { name: 'protobuf', size: 8, desc: 'Thư viện tuần tự hóa dữ liệu cấu trúc của Google (Protocol Buffers).', category: '6. Định dạng Dữ liệu & Mã hóa (Data Formats & Serialization)' },
  { name: 'asn1crypto', size: 2, desc: 'Trình phân tích cú pháp ASN.1 nhanh phục vụ cho việc đọc chứng chỉ mã hóa.', category: '6. Định dạng Dữ liệu & Mã hóa (Data Formats & Serialization)' },

  // 7. Mật mã & Bảo mật (Cryptography & Security)
  { name: 'cryptography', size: 6, desc: 'Cung cấp các công thức và thuật toán mã hóa cốt lõi (AES, RSA...).', category: '7. Mật mã & Bảo mật (Cryptography & Security)' },
  { name: 'pyopenssl', size: 3, desc: 'Wrapper module quanh thư viện OpenSSL của hệ thống.', category: '7. Mật mã & Bảo mật (Cryptography & Security)' },
  { name: 'bcrypt', size: 2, desc: 'Thuật toán băm (hash) mật khẩu an toàn, chống tấn công brute-force.', category: '7. Mật mã & Bảo mật (Cryptography & Security)' },
  { name: 'pyjwt', size: 1, desc: 'Mã hóa và giải mã JSON Web Tokens (JWT) để xác thực người dùng.', category: '7. Mật mã & Bảo mật (Cryptography & Security)' },
  { name: 'passlib', size: 2, desc: 'Quản lý và kiểm tra mật khẩu toàn diện với nhiều cơ chế băm khác nhau.', category: '7. Mật mã & Bảo mật (Cryptography & Security)' },
  { name: 'rsa', size: 1, desc: 'Thư viện cài đặt thuật toán mã hóa bất đối xứng RSA thuần Python.', category: '7. Mật mã & Bảo mật (Cryptography & Security)' },
  { name: 'oauthlib', size: 2, desc: 'Cung cấp giải pháp triển khai framework xác thực OAuth1 và OAuth2.', category: '7. Mật mã & Bảo mật (Cryptography & Security)' },

  // 8. Phát triển Web & API (Web Frameworks & Async)
  { name: 'django', size: 15, desc: 'Web framework cấp cao "all-in-one" đầy đủ tính năng bảo mật và quản trị dữ liệu.', category: '8. Phát triển Web & API (Web Frameworks & Async)' },
  { name: 'flask', size: 5, desc: 'Micro web framework gọn nhẹ, linh hoạt, dễ mở rộng.', category: '8. Phát triển Web & API (Web Frameworks & Async)' },
  { name: 'fastapi', size: 6, desc: 'Web framework hiện đại, hiệu năng cực cao dựa trên Starlette và Pydantic để tạo API.', category: '8. Phát triển Web & API (Web Frameworks & Async)' },
  { name: 'uvicorn', size: 3, desc: 'Máy chủ web ASGI tốc độ cao dùng để chạy các ứng dụng như FastAPI.', category: '8. Phát triển Web & API (Web Frameworks & Async)' },
  { name: 'gunicorn', size: 4, desc: 'Máy chủ HTTP WSGI dành cho các ứng dụng Python Web trên môi trường Linux.', category: '8. Phát triển Web & API (Web Frameworks & Async)' },
  { name: 'werkzeug', size: 4, desc: 'Bộ thư viện tiện ích WSGI mạnh mẽ, nền tảng của Flask.', category: '8. Phát triển Web & API (Web Frameworks & Async)' },
  { name: 'starlette', size: 3, desc: 'Bộ toolkit ASGI cài đặt sẵn các tính năng phục vụ xây dựng dịch vụ async.', category: '8. Phát triển Web & API (Web Frameworks & Async)' },
  { name: 'jinja2', size: 3, desc: 'Ngôn ngữ tạo mẫu (template engine) cho văn bản/HTML phổ biến nhất.', category: '8. Phát triển Web & API (Web Frameworks & Async)' },
  { name: 'celery', size: 8, desc: 'Hế thống quản lý hàng đợi tác vụ tác vụ ngầm/phân tán (Distributed Task Queue).', category: '8. Phát triển Web & API (Web Frameworks & Async)' },
  { name: 'redis', size: 4, desc: 'Thư viện kết nối và tương tác với cơ sở dữ liệu lưu trữ trên RAM Redis.', category: '8. Phát triển Web & API (Web Frameworks & Async)' },

  // 9. Kiểm thử phần mềm (Testing & Quality)
  { name: 'pytest', size: 4, desc: 'Framework viết test case tự động phổ biến, trực quan và dễ mở rộng.', category: '9. Kiểm thử phần mềm (Testing & Quality)' },
  { name: 'mock', size: 1, desc: 'Giả lập các đối tượng/hàm trong quá trình kiểm thử.', category: '9. Kiểm thử phần mềm (Testing & Quality)' },
  { name: 'tox', size: 2, desc: 'Công cụ tự động hóa việc kiểm thử ứng dụng trên nhiều môi trường Python khác nhau.', category: '9. Kiểm thử phần mềm (Testing & Quality)' },
  { name: 'coverage', size: 2, desc: 'Đo lường tỷ lệ phần trăm dòng code đã được chạy qua kiểm thử (code coverage).', category: '9. Kiểm thử phần mềm (Testing & Quality)' },
  { name: 'flake8', size: 2, desc: 'Công cụ kiểm tra cú pháp và phong cách viết code (Style guide linting).', category: '9. Kiểm thử phần mềm (Testing & Quality)' },
  { name: 'black', size: 3, desc: 'Trình tự động định dạng (format) code Python nghiêm ngặt theo chuẩn PEP 8.', category: '9. Kiểm thử phần mềm (Testing & Quality)' },
  { name: 'isort', size: 1, desc: 'Tự động sắp xếp các dòng import thư viện theo thứ tự chữ cái và phân loại.', category: '9. Kiểm thử phần mềm (Testing & Quality)' },
  { name: 'mypy', size: 8, desc: 'Trình kiểm tra kiểu tĩnh (static type checker) cho Python.', category: '9. Kiểm thử phần mềm (Testing & Quality)' },

  // 10. Giao diện Dòng lệnh (CLI) & Hiển thị Terminal
  { name: 'click', size: 2, desc: 'Thư viện tạo giao diện dòng lệnh (CLI) đẹp mắt bằng cách trang trí (decorators).', category: '10. Giao diện Dòng lệnh (CLI) & Hiển thị Terminal' },
  { name: 'colorama', size: 1, desc: 'Thư viện giúp in chữ có màu sắc ra màn hình terminal (cross-platform).', category: '10. Giao diện Dòng lệnh (CLI) & Hiển thị Terminal' },
  { name: 'rich', size: 5, desc: 'Thư viện viết ứng dụng Terminal cực đẹp với màu sắc, bảng, thanh tiến trình, markdown.', category: '10. Giao diện Dòng lệnh (CLI) & Hiển thị Terminal' },
  { name: 'tqdm', size: 2, desc: 'Tạo thanh tiến trình (progress bar) thông minh, trực quan cho các vòng lặp.', category: '10. Giao diện Dòng lệnh (CLI) & Hiển thị Terminal' },
  { name: 'prompt-toolkit', size: 4, desc: 'Thư viện xây dựng các ứng dụng dòng lệnh tương tác mạnh mẽ.', category: '10. Giao diện Dòng lệnh (CLI) & Hiển thị Terminal' },

  // 11. Xử lý Ảnh, Video & Đa phương tiện
  { name: 'pillow', size: 6, desc: 'Thư viện xử lý, chỉnh sửa ảnh (cắt, xoay, bộ lọc) cốt lõi của Python.', category: '11. Xử lý Ảnh, Video & Đa phương tiện' },
  { name: 'opencv-python', size: 35, desc: 'Thư viện thị giác máy tính (Computer Vision) và xử lý video thời gian thực hàng đầu.', category: '11. Xử lý Ảnh, Video & Đa phương tiện' },
  { name: 'imageio', size: 8, desc: 'Thư viện cung cấp giao diện dễ dàng để đọc ghi nhiều định dạng ảnh, video, dữ liệu thể tích.', category: '11. Xử lý Ảnh, Video & Đa phương tiện' },
  { name: 'moviepy', size: 12, desc: 'Thư viện chỉnh sửa video (cắt ghép, chèn chữ, xử lý hiệu ứng âm thanh).', category: '11. Xử lý Ảnh, Video & Đa phương tiện' },

  // 12. Tương tác Cơ sở dữ liệu (Databases & ORM)
  { name: 'sqlalchemy', size: 10, desc: 'Bộ công cụ SQL và ORM (Object-Relational Mapping) mạnh mẽ, linh hoạt bậc nhất.', category: '12. Tương tác Cơ sở dữ liệu (Databases & ORM)' },
  { name: 'psycopg2-binary', size: 6, desc: 'Thư viện driver phổ biến nhất để kết nối Python với PostgreSQL.', category: '12. Tương tác Cơ sở dữ liệu (Databases & ORM)' },
  { name: 'pymongo', size: 5, desc: 'Driver chính thức để tương tác với cơ sở dữ liệu NoSQL MongoDB.', category: '12. Tương tác Cơ sở dữ liệu (Databases & ORM)' },
  { name: 'mysql-connector-python', size: 8, desc: 'Driver chính thức của Oracle giúp kết nối với MySQL.', category: '12. Tương tác Cơ sở dữ liệu (Databases & ORM)' },
  { name: 'alembic', size: 4, desc: 'Công cụ quản lý và đồng bộ hóa cấu trúc database (migration) đi kèm SQLAlchemy.', category: '12. Tương tác Cơ sở dữ liệu (Databases & ORM)' },

  // 13. Xử lý File đặc thù (Văn bản, Nén)
  { name: 'openpyxl', size: 5, desc: 'Thư viện đọc và ghi các file Excel định dạng XLSX.', category: '13. Xử lý File đặc thù (Văn bản, Nén)' },
  { name: 'python-docx', size: 4, desc: 'Tạo, sửa đổi các file Microsoft Word (.docx).', category: '13. Xử lý File đặc thù (Văn bản, Nén)' },
  { name: 'pypdf', size: 5, desc: 'Trích xuất dữ liệu, văn bản và xử lý tệp tin định dạng PDF.', category: '13. Xử lý File đặc thù (Văn bản, Nén)' },
  { name: 'zstandard', size: 6, desc: 'Cung cấp bindings cho thuật toán nén dữ liệu Zstandard thế hệ mới của Facebook đạt tỷ lệ nén cao và tốc độ rất nhanh.', category: '13. Xử lý File đặc thù (Văn bản, Nén)' },

  // 14. Phát triển Bot & Tương tác API (Discord, Telegram, Slack, OpenAI...)
  { name: 'discord.py', size: 5, desc: 'Thư viện bất đồng bộ (async) phổ biến nhất để tạo Bot Discord, quản lý server, tin nhắn và sự kiện.', category: '14. Phát triển Bot & Tương tác API (Discord, Telegram, Slack, OpenAI...)' },
  { name: 'openai', size: 6, desc: 'SDK chính thức của OpenAI để tích hợp ChatGPT, GPT-4, DALL-E, và Embedding vào ứng dụng.', category: '14. Phát triển Bot & Tương tác API (Discord, Telegram, Slack, OpenAI...)' },
  { name: 'anthropic', size: 5, desc: 'SDK chính thức để gọi các mô hình ngôn ngữ lớn Claude (Claude 3.5 Sonnet, Opus) của Anthropic.', category: '14. Phát triển Bot & Tương tác API (Discord, Telegram, Slack, OpenAI...)' },
  { name: 'google-generativeai', size: 6, desc: 'Thư viện kết nối với các mô hình AI thế hệ mới Gemini của Google.', category: '14. Phát triển Bot & Tương tác API (Discord, Telegram, Slack, OpenAI...)' },
  { name: 'python-telegram-bot', size: 8, desc: 'Framework mạnh mẽ, hỗ trợ async giúp xây dựng Bot Telegram từ cơ bản đến nâng cao.', category: '14. Phát triển Bot & Tương tác API (Discord, Telegram, Slack, OpenAI...)' },
  { name: 'slack-sdk', size: 4, desc: 'Bộ công cụ chính thức để xây dựng Bot và tích hợp các tính năng vào không gian làm việc Slack.', category: '14. Phát triển Bot & Tương tác API (Discord, Telegram, Slack, OpenAI...)' },
  { name: 'line-bot-sdk', size: 4, desc: 'SDK chính thức để phát triển ứng dụng và bot trên nền tảng nhắn tin LINE.', category: '14. Phát triển Bot & Tương tác API (Discord, Telegram, Slack, OpenAI...)' },
  { name: 'twitchio', size: 3, desc: 'Thư viện async thiết kế riêng để viết Bot Chat và tương tác với API của nền tảng livestream Twitch.', category: '14. Phát triển Bot & Tương tác API (Discord, Telegram, Slack, OpenAI...)' },

  // 15. Tối ưu hóa & Triển khai AI (ONNX, Biến đổi Mô hình, Tăng tốc)
  { name: 'onnxruntime', size: 45, desc: 'Trình thực thi (engine) hiệu năng cao của Microsoft để chạy các mô hình định dạng ONNX trên cả CPU và GPU.', category: '15. Tối ưu hóa & Triển khai AI (ONNX, Biến đổi Mô hình, Tăng tốc)' },
  { name: 'onnx', size: 15, desc: 'Thư viện cốt lõi để định nghĩa, tạo và chuyển đổi cấu trúc đồ thị tính toán của định dạng Open Neural Network Exchange.', category: '15. Tối ưu hóa & Triển khai AI (ONNX, Biến đổi Mô hình, Tăng tốc)' },
  { name: 'tensorrt', size: 50, desc: 'SDK của NVIDIA giúp tối ưu hóa và tăng tốc độ suy luận (inference) của mô hình Deep Learning trên GPU NVIDIA.', category: '15. Tối ưu hóa & Triển khai AI (ONNX, Biến đổi Mô hình, Tăng tốc)' },
  { name: 'openvino', size: 40, desc: 'Bộ công cụ của Intel giúp tối ưu hóa và triển khai các mô hình AI trên phần cứng Intel (CPU, iGPU, NPU).', category: '15. Tối ưu hóa & Triển khai AI (ONNX, Biến đổi Mô hình, Tăng tốc)' },
  { name: 'accelerate', size: 8, desc: 'Thư viện của Hugging Face giúp dễ dàng chạy, huấn luyện mô hình trên cấu hình Multi-GPU hoặc TPU với vài dòng code.', category: '15. Tối ưu hóa & Triển khai AI (ONNX, Biến đổi Mô hình, Tăng tốc)' },
  { name: 'safetensors', size: 4, desc: 'Định dạng lưu trữ trọng số (weights) mô hình AI mới, siêu nhanh và bảo mật cao, thay thế cho định dạng pickle truyền thống.', category: '15. Tối ưu hóa & Triển khai AI (ONNX, Biến đổi Mô hình, Tăng tốc)' },
  { name: 'sentence-transformers', size: 25, desc: 'Thư viện chuyên dụng để tính toán Embedding cho văn bản, câu và hình ảnh (phục vụ tìm kiếm ngữ nghĩa).', category: '15. Tối ưu hóa & Triển khai AI (ONNX, Biến đổi Mô hình, Tăng tốc)' },

  // 16. Thu thập Dữ liệu mạng (Web Scraping & Thu thập dữ liệu quy mô lớn)
  { name: 'scrapy', size: 12, desc: 'Framework cào dữ liệu (Web Scraping) mạnh mẽ, kiến trúc bất đồng bộ, chuyên dùng cho các dự án khai thác dữ liệu quy mô lớn.', category: '16. Thu thập Dữ liệu mạng (Web Scraping & Thu thập dữ liệu quy mô lớn)' },
  { name: 'playwright', size: 35, desc: 'Thư viện tự động hóa trình duyệt thế hệ mới (Chromium, Firefox, WebKit) cực nhanh, xử lý hoàn hảo các trang Single Page Application (SPA).', category: '16. Thu thập Dữ liệu mạng (Web Scraping & Thu thập dữ liệu quy mô lớn)' },
  { name: 'selenium', size: 18, desc: 'Công cụ tự động hóa trình duyệt kinh điển, hỗ trợ giả lập hành vi người dùng (click, cuộn chuột, điền form) để cào dữ liệu hoặc test UI.', category: '16. Thu thập Dữ liệu mạng (Web Scraping & Thu thập dữ liệu quy mô lớn)' },
  { name: 'httpx[http2]', size: 5, desc: 'Phần mở rộng của httpx hỗ trợ giao thức HTTP/2, giúp cào dữ liệu từ các trang web hiện đại tránh bị chặn.', category: '16. Thu thập Dữ liệu mạng (Web Scraping & Thu thập dữ liệu quy mô lớn)' },
  { name: 'lxml', size: 6, desc: 'Trình phân tích cú pháp (parser) XML và HTML bằng C siêu nhanh, thường kết hợp với Beautiful Soup để tăng tốc độ xử lý.', category: '16. Thu thập Dữ liệu mạng (Web Scraping & Thu thập dữ liệu quy mô lớn)' },
  { name: 'feedparser', size: 3, desc: 'Thư viện chuyên dụng để tải và phân tích dữ liệu từ các nguồn cấp dữ liệu RSS hoặc Atom.', category: '16. Thu thập Dữ liệu mạng (Web Scraping & Thu thập dữ liệu quy mô lớn)' },

  // 17. Xử lý Ảnh nâng cao & Thị giác Máy tính (Computer Vision)
  { name: 'scikit-image', size: 15, desc: 'Tập hợp các thuật toán xử lý ảnh khoa học (phân vùng, biến đổi hình học, lọc nhiễu) xây dựng trên NumPy.', category: '17. Xử lý Ảnh nâng cao & Thị giác Máy tính (Computer Vision)' },
  { name: 'albumentations', size: 8, desc: 'Thư viện tăng cường dữ liệu ảnh (Image Augmentation) siêu nhanh, không thể thiếu khi huấn luyện mô hình Computer Vision.', category: '17. Xử lý Ảnh nâng cao & Thị giác Máy tính (Computer Vision)' },
  { name: 'pytesseract', size: 6, desc: 'Lớp bọc (wrapper) cho công cụ Tesseract OCR của Google, dùng để nhận diện và trích xuất chữ viết từ hình ảnh.', category: '17. Xử lý Ảnh nâng cao & Thị giác Máy tính (Computer Vision)' },
  { name: 'face-recognition', size: 12, desc: 'Thư viện nhận diện khuôn mặt đơn giản nhất thế giới, xây dựng trên dlib với độ chính xác cực cao.', category: '17. Xử lý Ảnh nâng cao & Thị giác Máy tính (Computer Vision)' },
  { name: 'dlib', size: 20, desc: 'Thư viện C++ mã nguồn mở có binding Python, chứa các thuật toán học máy chuyên sâu về nhận diện điểm mốc khuôn mặt (facial landmarks).', category: '17. Xử lý Ảnh nâng cao & Thị giác Máy tính (Computer Vision)' },
  { name: 'imutils', size: 3, desc: 'Chuỗi các hàm tiện ích giúp việc xử lý ảnh với OpenCV (xoay, đổi kích thước, hiển thị) trở nên ngắn gọn hơn.', category: '17. Xử lý Ảnh nâng cao & Thị giác Máy tính (Computer Vision)' },

  // 18. Web Frameworks & Kiến trúc API nâng cao
  { name: 'channels', size: 8, desc: 'Tiện ích mở rộng cho Django giúp xử lý các giao thức bất đồng bộ như WebSockets, MQTT, và chat protocols.', category: '18. Web Frameworks & Kiến trúc API nâng cao' },
  { name: 'django-rest-framework', size: 10, desc: 'Bộ công cụ toàn diện và mạnh mẽ nhất để xây dựng Web API dựa trên nền tảng Django.', category: '18. Web Frameworks & Kiến trúc API nâng cao' },
  { name: 'sqlmodel', size: 6, desc: 'Thư viện viết bởi tác giả FastAPI, kết hợp sức mạnh của SQLAlchemy và Pydantic để tương tác DB bằng Python Type Hints.', category: '18. Web Frameworks & Kiến trúc API nâng cao' },
  { name: 'tortoise-orm', size: 6, desc: 'Thư viện ORM bất đồng bộ (async) dễ sử dụng, lấy cảm hứng thiết kế từ cú pháp ORM của Django.', category: '18. Web Frameworks & Kiến trúc API nâng cao' },
  { name: 'strawberry-graphql', size: 5, desc: 'Thư viện thiết kế API GraphQL hiện đại, dựa trên tính năng Type Hints của Python 3.', category: '18. Web Frameworks & Kiến trúc API nâng cao' },
  { name: 'python-multipart', size: 2, desc: 'Trình phân tích dữ liệu form dạng mã hóa nhiều phần (multipart/form-data), bắt buộc có khi xử lý upload file trong FastAPI.', category: '18. Web Frameworks & Kiến trúc API nâng cao' },
  { name: 'authlib', size: 5, desc: 'Thư viện toàn diện để xây dựng hoặc kết nối với các dịch vụ chứng thực OAuth 1.0, OAuth 2.0, và OpenID Connect.', category: '18. Web Frameworks & Kiến trúc API nâng cao' },
  { name: 'whitenoise', size: 2, desc: 'Cho phép ứng dụng web (như Django/Flask) tự phục vụ các file tĩnh (static files) một cách tối ưu mà không cần cấu hình Nginx.', category: '18. Web Frameworks & Kiến trúc API nâng cao' },

  // 19. Xử lý Ngôn ngữ Tự nhiên (NLP) & Tìm kiếm Văn bản
  { name: 'spacy', size: 18, desc: 'Thư viện NLP công nghiệp, cực nhanh, chuyên dùng để tách từ, gắn nhãn từ loại, và nhận diện thực thể có tên (NER).', category: '19. Xử lý Ngôn ngữ Tự nhiên (NLP) & Tìm kiếm Văn bản' },
  { name: 'nltk', size: 12, desc: 'Bộ công cụ học thuật toàn diện nhất cho xử lý ngôn ngữ tự nhiên, chứa hàng trăm tập dữ liệu mẫu và tài liệu ngôn ngữ.', category: '19. Xử lý Ngôn ngữ Tự nhiên (NLP) & Tìm kiếm Văn bản' },
  { name: 'rank-bm25', size: 3, desc: 'Thuật toán xếp hạng văn bản kinh điển (BM25), lõi của các hệ thống tìm kiếm (Search Engine) hiện đại.', category: '19. Xử lý Ngôn ngữ Tự nhiên (NLP) & Tìm kiếm Văn bản' },
  { name: 'langchain', size: 15, desc: 'Framework kết nối các LLM với các nguồn dữ liệu bên ngoài để xây dựng ứng dụng AI (RAG, Agent).', category: '19. Xử lý Ngôn ngữ Tự nhiên (NLP) & Tìm kiếm Văn bản' },
  { name: 'textblob', size: 5, desc: 'Thư viện đơn giản giúp xử lý dữ liệu văn bản, phân tích cảm xúc (Sentiment Analysis) và dịch thuật nhanh.', category: '19. Xử lý Ngôn ngữ Tự nhiên (NLP) & Tìm kiếm Văn bản' },
  { name: 'faiss-cpu', size: 14, desc: 'Thư viện của Meta chuyên dùng để tìm kiếm độ tương đồng và gom cụm các vector mật độ cao (Vector Database dạng nhúng).', category: '19. Xử lý Ngôn ngữ Tự nhiên (NLP) & Tìm kiếm Văn bản' },

  // 20. Giao diện Người dùng đồ họa (GUI Desktop Apps)
  { name: 'pyqt6', size: 22, desc: 'Thư viện binding Python cho framework Qt, giúp thiết kế giao diện phần mềm Desktop chuyên nghiệp, đa nền tảng.', category: '20. Giao diện Người dùng đồ họa (GUI Desktop Apps)' },
  { name: 'flet', size: 12, desc: 'Framework cho phép xây dựng ứng dụng Flutter (Web, Desktop, Mobile) hoàn toàn bằng ngôn ngữ Python.', category: '20. Giao diện Người dùng đồ họa (GUI Desktop Apps)' },
  { name: 'customtkinter', size: 6, desc: 'Bản nâng cấp giao diện hiện đại (hỗ trợ Dark Mode, bo góc) dựa trên thư viện giao diện Tkinter mặc định của Python.', category: '20. Giao diện Người dùng đồ họa (GUI Desktop Apps)' },
  { name: 'kivy', size: 15, desc: 'Thư viện mã nguồn mở để phát triển các ứng dụng có giao diện tương tác đa điểm (Multi-touch), chạy được trên cả Android và iOS.', category: '20. Giao diện Người dùng đồ họa (GUI Desktop Apps)' },
  { name: 'pywebview', size: 5, desc: 'Lớp bọc mỏng cho phép hiển thị một trang web (HTML/CSS/JS) như một ứng dụng Desktop GUI độc lập.', category: '20. Giao diện Người dùng đồ họa (GUI Desktop Apps)' },

  // 21. Tự động hóa Tác vụ & Hệ thống (RPA & System Automation)
  { name: 'pyautogui', size: 6, desc: 'Tự động hóa chuột và bàn phím, cho phép di chuyển chuột, click, gõ phím trên màn hình dựa trên tọa độ.', category: '21. Tự động hóa Tác vụ & Hệ thống (RPA & System Automation)' },
  { name: 'schedule', size: 2, desc: 'Thư viện lập lịch chạy tác vụ cực kỳ trực quan và dễ đọc (ví dụ: schedule.every().day.at("10:30").do(job)).', category: '21. Tự động hóa Tác vụ & Hệ thống (RPA & System Automation)' },
  { name: 'fabric', size: 6, desc: 'Thư viện thực thi các lệnh hệ thống từ xa qua SSH một cách có hệ thống, chuyên dùng cho Deploy và Devops.', category: '21. Tự động hóa Tác vụ & Hệ thống (RPA & System Automation)' },
  { name: 'psutil', size: 4, desc: 'Trích xuất thông tin hệ thống phần cứng (CPU, RAM, Đĩa, Mạng) và quản lý các tiến trình (Processes) đang chạy.', category: '21. Tự động hóa Tác vụ & Hệ thống (RPA & System Automation)' },
  { name: 'python-dotenv', size: 1, desc: 'Tự động đọc các biến môi trường từ file .env vào cấu hình hệ thống os.environ.', category: '21. Tự động hóa Tác vụ & Hệ thống (RPA & System Automation)' },
  { name: 'keyboard', size: 2, desc: 'Kiểm soát hoàn toàn bàn phím hệ thống, lắng nghe các sự kiện nhấn phím (hotkeys) trên toàn hệ điều hành.', category: '21. Tự động hóa Tác vụ & Hệ thống (RPA & System Automation)' },
  { name: 'mouse', size: 2, desc: 'Tương tự thư viện keyboard nhưng chuyên dùng để lắng nghe và giả lập toàn bộ hành vi của chuột.', category: '21. Tự động hóa Tác vụ & Hệ thống (RPA & System Automation)' },

  // 22. Thao tác Tài liệu & Báo cáo nâng cao (Data Reporting)
  { name: 'xlsxwriter', size: 6, desc: 'Thư viện viết file Excel cực mạnh, hỗ trợ tạo biểu đồ phức tạp, định dạng ô conditional formatting mà openpyxl khó làm được.', category: '22. Thao tác Tài liệu & Báo cáo nâng cao (Data Reporting)' },
  { name: 'weasyprint', size: 12, desc: 'Chuyển đổi các trang web được thiết kế bằng HTML và CSS thành các file tài liệu PDF có giao diện chuẩn chỉnh để in ấn.', category: '22. Thao tác Tài liệu & Báo cáo nâng cao (Data Reporting)' },
  { name: 'reportlab', size: 10, desc: 'Thư viện cấp thấp cho phép vẽ, thiết kế và tạo các file PDF phức tạp theo từng tọa độ chính xác.', category: '22. Thao tác Tài liệu & Báo cáo nâng cao (Data Reporting)' },
  { name: 'python-pptx', size: 8, desc: 'Thư viện dùng để đọc, sửa đổi và tự động tạo các slide thuyết trình Microsoft PowerPoint (.pptx).', category: '22. Thao tác Tài liệu & Báo cáo nâng cao (Data Reporting)' },
  { name: 'markdown', size: 3, desc: 'Trình chuyển đổi mã nguồn văn bản định dạng Markdown thành mã HTML.', category: '22. Thao tác Tài liệu & Báo cáo nâng cao (Data Reporting)' },

  // 23. Khoa học dữ liệu lớn & Tính toán phân tán (Big Data / Parallel Computing)
  { name: 'dask', size: 15, desc: 'Thư viện tính toán song song linh hoạt, giúp mở rộng quy mô các mảng NumPy và DataFrame Pandas lên kích cỡ Big Data.', category: '23. Khoa học dữ liệu lớn & Tính toán phân tán (Big Data / Parallel Computing)' },
  { name: 'pyspark', size: 25, desc: 'Giao diện Python (API) chính thức của Apache Spark, nền tảng xử lý dữ liệu lớn phân tán hàng đầu hiện nay.', category: '23. Khoa học dữ liệu lớn & Tính toán phân tán (Big Data / Parallel Computing)' },
  { name: 'joblib', size: 4, desc: 'Bộ công cụ cung cấp giải pháp tính toán đường ống (pipelining) song song và lưu bộ nhớ đệm (caching) kết quả hàm cực tốt.', category: '23. Khoa học dữ liệu lớn & Tính toán phân tán (Big Data / Parallel Computing)' },
  { name: 'ray', size: 18, desc: 'Framework mã nguồn mở giúp xây dựng và chạy các ứng dụng phân tán, đặc biệt tối ưu cho các tác vụ Machine Learning và AI Agent.', category: '23. Khoa học dữ liệu lớn & Tính toán phân tán (Big Data / Parallel Computing)' },
  { name: 'multiprocess', size: 4, desc: 'Bản nâng cấp mạnh mẽ hơn của module multiprocessing mặc định, khắc phục nhiều lỗi liên quan đến serialize (mã hóa dữ liệu giữa các luồng).', category: '23. Khoa học dữ liệu lớn & Tính toán phân tán (Big Data / Parallel Computing)' },

  // 24. Trực quan hóa dữ liệu Địa lý & Không gian (GIS / Maps)
  { name: 'geopandas', size: 12, desc: 'Mở rộng năng lực của Pandas, cho phép thao tác và thực hiện các phép toán trên dữ liệu hình học địa lý (Spatial data).', category: '24. Trực quan hóa dữ liệu Địa lý & Không gian (GIS / Maps)' },
  { name: 'folium', size: 8, desc: 'Xây dựng trên thư viện Leaflet.js, giúp vẽ các bản đồ tương tác, đánh dấu tọa độ địa lý trực tiếp lên bản đồ vệ tinh.', category: '24. Trực quan hóa dữ liệu Địa lý & Không gian (GIS / Maps)' },
  { name: 'shapely', size: 5, desc: 'Thư viện chuyên toán học hình học phẳng, dùng để phân tích và thao tác với các thực thể hình học (Point, LineString, Polygon).', category: '24. Trực quan hóa dữ liệu Địa lý & Không gian (GIS / Maps)' },
  { name: 'pyproj', size: 4, desc: 'Thư viện thực hiện chuyển đổi giữa các hệ tọa độ địa lý và hệ bản đồ (Cartographic projections).', category: '24. Trực quan hóa dữ liệu Địa lý & Không gian (GIS / Maps)' },
  { name: 'rasterio', size: 15, desc: 'Thư viện chuyên dụng để đọc và ghi các định dạng ảnh raster địa lý (như ảnh chụp từ vệ tinh GeoTIFF).', category: '24. Trực quan hóa dữ liệu Địa lý & Không gian (GIS / Maps)' },

  // 25. Quản lý luồng công việc (Data Pipeline / MLOps Orchestration)
  { name: 'apache-airflow', size: 20, desc: 'Nền tảng quản lý luồng công việc (Workflow) lập lịch và giám sát các Data Pipeline bằng code Python (DAGs).', category: '25. Quản lý luồng công việc (Data Pipeline / MLOps Orchestration)' },
  { name: 'prefect', size: 14, desc: 'Hệ thống điều phối tác vụ (Orchestration) thế hệ mới, hiện đại và linh hoạt hơn Airflow, hỗ trợ tư duy lập trình async thuần túy.', category: '25. Quản lý luồng công việc (Data Pipeline / MLOps Orchestration)' },
  { name: 'mlflow', size: 18, desc: 'Nền tảng MLOps mã nguồn mở giúp quản lý toàn bộ vòng đời của mô hình AI (theo dõi thí nghiệm, đóng gói, lưu trữ mô hình).', category: '25. Quản lý luồng công việc (Data Pipeline / MLOps Orchestration)' },
  { name: 'wandb', size: 12, desc: 'Công cụ MLOps tuyệt đẹp giúp theo dõi trực quan các thông số huấn luyện mô hình (loss, accuracy) theo thời gian thực.', category: '25. Quản lý luồng công việc (Data Pipeline / MLOps Orchestration)' },
  { name: 'dvc', size: 10, desc: 'Hệ thống quản lý phiên bản dành riêng cho các tập dữ liệu lớn (Dataset) và mô hình ML, hoạt động mượt mà cùng Git.', category: '25. Quản lý luồng công việc (Data Pipeline / MLOps Orchestration)' },

  // 26. Công cụ kiểm thử hiệu năng & Giả lập dữ liệu (Testing & Mocking)
  { name: 'locust', size: 8, desc: 'Công cụ kiểm thử hiệu năng và đo sức chịu tải của Web/API (Load Testing) phân tán, viết kịch bản test bằng code Python thông thường.', category: '26. Công cụ kiểm thử hiệu năng & Giả lập dữ liệu (Testing & Mocking)' },
  { name: 'faker', size: 5, desc: 'Thư viện tự động tạo ra các dữ liệu giả lập cực kỳ chân thật (tên, địa chỉ, số điện thoại, số thẻ tín dụng, văn bản) bằng nhiều ngôn ngữ.', category: '26. Công cụ kiểm thử hiệu năng & Giả lập dữ liệu (Testing & Mocking)' },
  { name: 'hypothesis', size: 4, desc: 'Thư viện kiểm thử dựa trên thuộc tính (Property-based testing), tự động tìm ra các trường hợp biên nguy hiểm gây crash code.', category: '26. Công cụ kiểm thử hiệu năng & Giả lập dữ liệu (Testing & Mocking)' },
  { name: 'pytest-asyncio', size: 2, desc: 'Tiện ích mở rộng bắt buộc phải có cho Pytest để có thể viết các bài kiểm thử (test case) cho hàm bất đồng bộ (async/await).', category: '26. Công cụ kiểm thử hiệu năng & Giả lập dữ liệu (Testing & Mocking)' },
  { name: 'freezegun', size: 2, desc: 'Cho phép bạn "đóng băng" hoặc tua thời gian hệ thống về một mốc cố định để kiểm thử các logic phụ thuộc vào thời gian thực.', category: '26. Công cụ kiểm thử hiệu năng & Giả lập dữ liệu (Testing & Mocking)' },
  { name: 'responses', size: 2, desc: 'Thư viện giả lập (mock) các phản hồi từ thư viện requests, giúp test API mà không cần gửi request thật ra Internet.', category: '26. Công cụ kiểm thử hiệu năng & Giả lập dữ liệu (Testing & Mocking)' },

  // 27. Nén, Mã hóa văn bản & Tối ưu hóa bộ nhớ
  { name: 'msgpack-python', size: 2, desc: 'Giao diện kết nối tốc độ cao cho MessagePack - cơ chế tuần tự hóa nhị phân siêu gọn nhẹ thay thế JSON.', category: '27. Nén, Mã hóa văn bản & Tối ưu hóa bộ nhớ' },
  { name: 'bitarray', size: 3, desc: 'Cung cấp cấu trúc mảng đối tượng chỉ chứa các bit (0 và 1), giúp tối ưu hóa tối đa dung lượng bộ nhớ RAM khi xử lý lượng lớn cờ logic.', category: '27. Nén, Mã hóa văn bản & Tối ưu hóa bộ nhớ' },
  { name: 'blosc', size: 8, desc: 'Trình nén dữ liệu mảng nhị phân tốc độ cao, được thiết kế đặc biệt để truyền tải dữ liệu số lượng lớn nhanh hơn việc không nén.', category: '27. Nén, Mã hóa văn bản & Tối ưu hóa bộ nhớ' },
  { name: 'brotli', size: 4, desc: 'Thư viện nén mã nguồn mở của Google, đạt hiệu suất nén văn bản và tài nguyên web vượt trội so với Gzip.', category: '27. Nén, Mã hóa văn bản & Tối ưu hóa bộ nhớ' },

  // 28. Tiện ích lập trình nâng cao (Developer Productivity & Core Tweaks)
  { name: 'icecream', size: 2, desc: 'Thay thế hàm print() khi debug. Nó tự động in ra tên biến, dòng code và giá trị của biến đó một cách rõ ràng kèm màu sắc.', category: '28. Tiện ích lập trình nâng cao (Developer Productivity & Core Tweaks)' },
  { name: 'loguru', size: 4, desc: 'Thư viện ghi log (logging) tuyệt vời, cấu hình siêu đơn giản, tự động xoay file log, phân màu chữ mà không cần thiết lập rườm rà.', category: '28. Tiện ích lập trình nâng cao (Developer Productivity & Core Tweaks)' },
  { name: 'tenacity', size: 3, desc: 'Thư viện cung cấp tính năng tự động thử lại (retry) tác vụ khi gặp lỗi (ví dụ: lỗi mạng khi gọi API) bằng cách sử dụng decorator.', category: '28. Tiện ích lập trình nâng cao (Developer Productivity & Core Tweaks)' },
  { name: 'deprecated', size: 1, desc: 'Cung cấp decorator @deprecated giúp đánh dấu một hàm/lớp đã lỗi thời và đưa ra cảnh báo cho người dùng khi họ gọi hàm đó.', category: '28. Tiện ích lập trình nâng cao (Developer Productivity & Core Tweaks)' },
  { name: 'more-itertools', size: 3, desc: 'Mở rộng module itertools mặc định, bổ sung hàng chục hàm xử lý vòng lặp, gộp nhóm và lọc mảng nâng cao.', category: '28. Tiện ích lập trình nâng cao (Developer Productivity & Core Tweaks)' },
  { name: 'toolz', size: 4, desc: 'Tập hợp các hàm tiện ích hỗ trợ lập trình chức năng (Functional Programming) trên các cấu trúc dữ liệu lặp.', category: '28. Tiện ích lập trình nâng cao (Developer Productivity & Core Tweaks)' },
  { name: 'attrs', size: 5, desc: 'Thư viện giúp định nghĩa các class Python cực nhanh mà không cần viết các hàm boilerplate như __init__, __repr__, hay __eq__.', category: '28. Tiện ích lập trình nâng cao (Developer Productivity & Core Tweaks)' },

  // 29. Web Tương tác & Khai phá dữ liệu nhanh (Dashboarding)
  { name: 'streamlit', size: 15, desc: 'Cách nhanh nhất để biến các script dữ liệu hoặc mô hình AI thành các ứng dụng web tương tác tuyệt đẹp chỉ bằng code Python.', category: '29. Web Tương tác & Khai phá dữ liệu nhanh (Dashboarding)' },
  { name: 'dash', size: 18, desc: 'Framework của Plotly giúp xây dựng các ứng dụng Web Dashboard phân tích dữ liệu chuyên sâu cấp doanh nghiệp bằng Python.', category: '29. Web Tương tác & Khai phá dữ liệu nhanh (Dashboarding)' },
  { name: 'gradio', size: 12, desc: 'Thư viện giúp tạo nhanh giao diện web chạy thử (demo) cho các mô hình Machine Learning / AI cực kỳ trực quan, dễ chia sẻ.', category: '29. Web Tương tác & Khai phá dữ liệu nhanh (Dashboarding)' },
  { name: 'panel', size: 10, desc: 'Thư viện tạo dashboard cao cấp, hỗ trợ kết nối linh hoạt giữa các widget tương tác và các công cụ vẽ đồ thị khác nhau.', category: '29. Web Tương tác & Khai phá dữ liệu nhanh (Dashboarding)' },

  // 30. Kết nối Phần cứng & IoT / Mạng cấp thấp
  { name: 'pyserial', size: 4, desc: 'Thư viện tiêu chuẩn để giao tiếp qua cổng nối tiếp (Serial Port), kết nối Python với Arduino, mạch nạp hoặc các thiết bị ngoại vi.', category: '30. Kết nối Phần cứng & IoT / Mạng cấp thấp' },
  { name: 'scapy', size: 12, desc: 'Thư viện phân tích gói tin mạng cấp thấp, cho phép gửi, gửi-nhận, đánh hơi (sniff) và giả mạo gói tin mạng.', category: '30. Kết nối Phần cứng & IoT / Mạng cấp thấp' },
  { name: 'paho-mqtt', size: 4, desc: 'Thư viện client chính thức của Eclipse để triển khai giao thức MQTT - giao thức truyền tải tin nhắn nhẹ phổ biến nhất trong IoT.', category: '30. Kết nối Phần cứng & IoT / Mạng cấp thấp' },
  { name: 'smbus2', size: 2, desc: 'Thư viện thuần Python giúp giao tiếp qua xe buýt I2C (SMBus), thường dùng trên Raspberry Pi để đọc cảm biến.', category: '30. Kết nối Phần cứng & IoT / Mạng cấp thấp' },

  // 31. Quản lý và xử lý Môi trường ảo (Environment Management)
  { name: 'virtualenv', size: 6, desc: 'Công cụ cốt lõi đứng sau lệnh tạo môi trường ảo độc lập cho các dự án Python, nhanh và mạnh mẽ hơn module venv mặc định.', category: '31. Quản lý và xử lý Môi trường ảo (Environment Management)' },
  { name: 'pipenv', size: 8, desc: 'Công cụ quản lý dự án cao cấp, kết hợp sức mạnh của pip và virtualenv vào một file cấu hình Pipfile duy nhất, giúp quản lý phiên bản thư viện chặt chẽ.', category: '31. Quản lý và xử lý Môi trường ảo (Environment Management)' },

  // 32. Quản lý Tiến trình & Cô lập Tài nguyên (Core Sandbox & Isolation)
  { name: 'docker', size: 15, desc: 'SDK chính thức giúp điều khiển Docker Daemon bằng Python để khởi tạo, quản lý và tiêu hủy container sandbox.', category: '32. Quản lý Tiến trình & Cô lập Tài nguyên (Core Sandbox & Isolation)' },
  { name: 'resource', size: 1, desc: 'Module tích hợp sẵn của Python (Unix) giúp đặt hạn mức (Hard/Soft limits) về tài nguyên CPU, RAM, file cho tiến trình con.', category: '32. Quản lý Tiến trình & Cô lập Tài nguyên (Core Sandbox & Isolation)' },
  { name: 'subprocess', size: 1, desc: 'Module cốt lõi của Python dùng khởi chạy các tiến trình bên ngoài, quản lý các luồng dữ liệu (stdin/stdout/stderr) và biến môi trường.', category: '32. Quản lý Tiến trình & Cô lập Tài nguyên (Core Sandbox & Isolation)' },
  { name: 'restrictedpython', size: 3, desc: 'Thư viện thiết lập môi trường thực thi Python bị giới hạn, chặn các hàm nguy hiểm như import, open, eval, exec từ người dùng.', category: '32. Quản lý Tiến trình & Cô lập Tài nguyên (Core Sandbox & Isolation)' },
  { name: 'pycpuid', size: 2, desc: 'Thư viện đọc thông tin chi tiết về kiến trúc CPU, giúp cấu hình sandbox nhận diện phần cứng máy chủ.', category: '32. Quản lý Tiến trình & Cô lập Tài nguyên (Core Sandbox & Isolation)' },

  // 33. Phân tích Mã nguồn & Kiểm tra Tĩnh (Static Analysis & AST)
  { name: 'ast', size: 1, desc: 'Module cây cú pháp trừu tượng tích hợp sẵn, dịch ngược mã nguồn thành dạng cây để quét và chặn các câu lệnh nguy hiểm.', category: '33. Phân tích Mã nguồn & Kiểm tra Tĩnh (Static Analysis & AST)' },
  { name: 'radon', size: 4, desc: 'Thư viện tính toán các chỉ số phức tạp của mã nguồn (Cyclomatic Complexity), phát hiện code rối hoặc vòng lặp vô hạn.', category: '33. Phân tích Mã nguồn & Kiểm tra Tĩnh (Static Analysis & AST)' },
  { name: 'bandit', size: 5, desc: 'Công cụ phân tích bảo mật tĩnh, chuyên tìm kiếm lỗ hổng phổ biến và hàm không an toàn trong script Python.', category: '33. Phân tích Mã nguồn & Kiểm tra Tĩnh (Static Analysis & AST)' },
  { name: 'pycdg', size: 3, desc: 'Thư viện hỗ trợ vẽ đồ thị phụ thuộc (Control Flow Graph) và phân tích tĩnh luồng chương trình.', category: '33. Phân tích Mã nguồn & Kiểm tra Tĩnh (Static Analysis & AST)' },

  // 34. Giả lập Mạng & Đánh chặn Gói tin (Network Emulation & Hooking)
  { name: 'mitmproxy', size: 18, desc: 'Công cụ và thư viện tạo proxy bản mã hóa (SSL/TLS interception), giúp đánh chặn và sửa đổi lưu lượng HTTP/HTTPS.', category: '34. Giả lập Mạng & Đánh chặn Gói tin (Network Emulation & Hooking)' },
  { name: 'pypcap', size: 5, desc: 'Bindings cấp thấp của Libpcap, dùng để ghi lại toàn bộ lịch sử lưu lượng mạng của sandbox ra file .pcap.', category: '34. Giả lập Mạng & Đánh chặn Gói tin (Network Emulation & Hooking)' },

  // 35. Hooking, Gỡ lỗi & Phân tích Động (Dynamic Analysis & Hooking)
  { name: 'frida', size: 25, desc: 'Framework bẻ hướng mã nguồn (Dynamic Instrumentation) đỉnh cao, cho phép tiêm script JS/Python theo dõi bộ nhớ tiến trình.', category: '35. Hooking, Gỡ lỗi & Phân tích Động (Dynamic Analysis & Hooking)' },
  { name: 'ptrace', size: 6, desc: 'Thư viện trên Linux cho phép tiến trình giám sát bám chặt (attach) và kiểm soát từng lệnh hệ thống (Syscalls) của tiến trình con.', category: '35. Hooking, Gỡ lỗi & Phân tích Động (Dynamic Analysis & Hooking)' },
  { name: 'pyelftools', size: 8, desc: 'Thư viện đọc và phân tích cấu trúc của file thực thi nhị phân định dạng ELF trên Linux.', category: '35. Hooking, Gỡ lỗi & Phân tích Động (Dynamic Analysis & Hooking)' },
  { name: 'pefile', size: 5, desc: 'Thư viện chuyên dụng đọc và thao tác với các file thực thi Windows (PE như .exe, .dll) để phân tích cấu trúc mã độc.', category: '35. Hooking, Gỡ lỗi & Phân tích Động (Dynamic Analysis & Hooking)' },

  // 36. Hệ thống File ảo & Lưu trữ tạm thời (Virtual File System & Memory)
  { name: 'fs', size: 4, desc: 'PyFilesystem2 cung cấp lớp trừu tượng cho hệ thống file ảo, cho phép lưu trữ hoàn toàn trên RAM (MemoryFS) hoặc file zip.', category: '36. Hệ thống File ảo & Lưu trữ tạm thời (Virtual File System & Memory)' },
  { name: 'pyfakefs', size: 3, desc: 'Thư viện giả lập hệ thống file cục bộ, đánh lừa các hàm open/os.path hướng vào bộ nhớ RAM ảo.', category: '36. Hệ thống File ảo & Lưu trữ tạm thời (Virtual File System & Memory)' },
  { name: 'shutil', size: 1, desc: 'Module tiêu chuẩn tích hợp sâu các hàm dọn dẹp môi trường, sao chép thư mục mẫu và xóa sạch dấu vết (rmtree).', category: '36. Hệ thống File ảo & Lưu trữ tạm thời (Virtual File System & Memory)' },
  { name: 'tempfile', size: 1, desc: 'Tạo thư mục và tệp tin tạm thời bảo mật cao, tự sinh tên ngẫu nhiên và tự hủy sau khi sử dụng.', category: '36. Hệ thống File ảo & Lưu trữ tạm thời (Virtual File System & Memory)' },

  // 37. Ghi log, Báo cáo & Lưu trữ Trạng thái (Logging & State Management)
  { name: 'sqlite3', size: 2, desc: 'Module cơ sở dữ liệu SQL nhúng tích hợp sẵn của Python, lưu trữ trạng thái local không cần máy chủ.', category: '37. Ghi log, Báo cáo & Lưu trữ Trạng thái (Logging & State Management)' },

  // 38. Tiện ích Đo đạc Thời gian & Xử lý Bất đồng bộ (Async & Micro-benchmarking)
  { name: 'asyncio', size: 1, desc: 'Thư viện chuẩn của Python hỗ trợ viết mã bất đồng bộ cực mạnh, nền tảng cho việc điều phối sandbox song song.', category: '38. Tiện ích Đo đạc Thời gian & Xử lý Bất đồng bộ (Async & Micro-benchmarking)' },
  { name: 'line_profiler', size: 3, desc: 'Đo đạc chính xác thời gian thực thi của từng dòng code bên trong sandbox xuống mức microsecond.', category: '38. Tiện ích Đo đạc Thời gian & Xử lý Bất đồng bộ (Async & Micro-benchmarking)' },
  { name: 'blinker', size: 2, desc: 'Hệ thống phát tín hiệu (Signal/Event dispatching) nội bộ cực nhanh và nhẹ để kích hoạt các hàm xử lý khẩn cấp.', category: '38. Tiện ích Đo đạc Thời gian & Xử lý Bất đồng bộ (Async & Micro-benchmarking)' },

  // 39. Kết nối, API & Giao thức Mạng (Advanced API Clients)
  { name: 'gql', size: 4, desc: 'Thư viện client GraphQL mạnh mẽ, hỗ trợ thực thi câu truy vấn (queries/mutations) bất đồng bộ qua WebSockets hoặc HTTP.', category: '39. Kết nối, API & Giao thức Mạng (Advanced API Clients)' },
  { name: 'grpcio', size: 12, desc: 'SDK lõi phát triển và kết nối microservices sử dụng giao thức gRPC tốc độ cao của Google.', category: '39. Kết nối, API & Giao thức Mạng (Advanced API Clients)' },
  { name: 'uplink', size: 3, desc: 'Biến các hàm Python thành một HTTP client khai báo (Declarative) bằng cách sử dụng decorators.', category: '39. Kết nối, API & Giao thức Mạng (Advanced API Clients)' },
  { name: 'pykube-ng', size: 4, desc: 'Thư viện client gọn nhẹ để giao tiếp trực tiếp với API của Kubernetes nhằm quản lý pods và cluster.', category: '39. Kết nối, API & Giao thức Mạng (Advanced API Clients)' },
  { name: 'websockets', size: 5, desc: 'Thư viện thuần Python xây dựng trên asyncio, chuyên viết kết nối WebSocket client và server hiệu năng cao.', category: '39. Kết nối, API & Giao thức Mạng (Advanced API Clients)' },
  { name: 'pika', size: 6, desc: 'Thư viện client chính thức và phổ biến nhất để gửi/nhận thông điệp với hệ thống hàng đợi RabbitMQ.', category: '39. Kết nối, API & Giao thức Mạng (Advanced API Clients)' },
  { name: 'kafka-python', size: 8, desc: 'Client thuần Python dành cho Apache Kafka, tối ưu cho việc phân phối và xử lý luồng dữ liệu lớn.', category: '39. Kết nối, API & Giao thức Mạng (Advanced API Clients)' },
  { name: 'aioredis', size: 4, desc: 'Thư viện client Redis bất đồng bộ, tối ưu hóa tốc độ kết nối cache hoặc pub/sub trong ứng dụng async.', category: '39. Kết nối, API & Giao thức Mạng (Advanced API Clients)' },
  { name: 'google-cloud-storage', size: 10, desc: 'SDK chính thức của Google để tương tác, upload và quản lý file trên hệ thống Google Cloud Storage (GCS).', category: '39. Kết nối, API & Giao thức Mạng (Advanced API Clients)' },
  { name: 'azure-storage-blob', size: 12, desc: 'Bộ công cụ của Microsoft để làm việc với Azure Blob Storage, tối ưu lưu trữ dữ liệu khối lượng lớn.', category: '39. Kết nối, API & Giao thức Mạng (Advanced API Clients)' },
  { name: 'stripe', size: 5, desc: 'SDK chính thức của nền tảng thanh toán toàn cầu Stripe, giúp tích hợp cổng thanh toán trực tiếp.', category: '39. Kết nối, API & Giao thức Mạng (Advanced API Clients)' },
  { name: 'twilio', size: 6, desc: 'Thư viện kết nối API Twilio, dùng tự động hóa gửi tin nhắn SMS, gọi điện thoại và xác thực OTP.', category: '39. Kết nối, API & Giao thức Mạng (Advanced API Clients)' },
  { name: 'pygithub', size: 4, desc: 'Thư viện wrapper cho GitHub Web API v3, giúp quản lý kho lưu trữ, mã nguồn và pull requests.', category: '39. Kết nối, API & Giao thức Mạng (Advanced API Clients)' },
  { name: 'imapclient', size: 3, desc: 'Thư viện client xử lý giao thức IMAP dễ sử dụng, giúp kết nối, đọc và quản lý email toàn diện.', category: '39. Kết nối, API & Giao thức Mạng (Advanced API Clients)' },
  { name: 'dnspython', size: 3, desc: 'Bộ công cụ xử lý DNS mạnh mẽ, hỗ trợ hầu hết các loại bản ghi (records) và phân tích phản hồi DNS.', category: '39. Kết nối, API & Giao thức Mạng (Advanced API Clients)' },
  { name: 'requests-oauthlib', size: 2, desc: 'Tiện ích mở rộng kết hợp requests và oauthlib, đơn giản hóa xác thực OAuth 1.0/2.0 khi gọi API.', category: '39. Kết nối, API & Giao thức Mạng (Advanced API Clients)' },
  { name: 'pyasn1', size: 2, desc: 'Thư viện mã hóa và giải mã cấu trúc dữ liệu theo chuẩn ASN.1, dùng trong giao thức mạng SNMP hoặc LDAP.', category: '39. Kết nối, API & Giao thức Mạng (Advanced API Clients)' },

  // 40. Hình ảnh hóa, Toán học & Vật lý (Visualization & Math Simulation)
  { name: 'mpmath', size: 5, desc: 'Thư viện toán học thuần Python chuyên dùng cho tính toán số thực và số phức với độ chính xác tùy ý.', category: '40. Hình ảnh hóa, Toán học & Vật lý (Visualization & Math Simulation)' },
  { name: 'networkx', size: 8, desc: 'Thư viện chuyên dụng để tạo, thao tác và nghiên cứu cấu trúc mạng lưới đồ thị phức tạp trong toán học.', category: '40. Hình ảnh hóa, Toán học & Vật lý (Visualization & Math Simulation)' },
  { name: 'pyvista', size: 15, desc: 'Thư viện trực quan hóa 3D nâng cao, đóng vai trò là lớp bọc dễ dùng cho VTK (Visualization Toolkit).', category: '40. Hình ảnh hóa, Toán học & Vật lý (Visualization & Math Simulation)' },
  { name: 'scikit-kinematics', size: 6, desc: 'Tính toán và phân tích động học của cơ thể người hoặc robot, xử lý ma trận xoay và dữ liệu cảm biến IMU.', category: '40. Hình ảnh hóa, Toán học & Vật lý (Visualization & Math Simulation)' },
  { name: 'pymunk', size: 10, desc: 'Thư viện mô phỏng vật lý 2D cực kỳ mượt mà, dựa trên lõi Chipmunk bằng C, mô phỏng va chạm, trọng lực.', category: '40. Hình ảnh hóa, Toán học & Vật lý (Visualization & Math Simulation)' },
  { name: 'astropy', size: 18, desc: 'Thư viện cốt lõi dành riêng cho Thiên văn học và Vật lý thiên văn, tính toán tọa độ vũ trụ và phân tích ảnh vệ tinh.', category: '40. Hình ảnh hóa, Toán học & Vật lý (Visualization & Math Simulation)' },
  { name: 'fipy', size: 12, desc: 'Giải phương trình vi phân dựa trên phương pháp thể tích hữu hạn (Finite Volume), mô phỏng truyền nhiệt, khuếch tán.', category: '40. Hình ảnh hóa, Toán học & Vật lý (Visualization & Math Simulation)' },
  { name: 'simpy', size: 6, desc: 'Framework mô phỏng sự kiện rời rạc dựa trên tiến trình, dùng mô phỏng hàng đợi, hệ thống giao thông.', category: '40. Hình ảnh hóa, Toán học & Vật lý (Visualization & Math Simulation)' },
  { name: 'pint', size: 4, desc: 'Thư viện quản lý và chuyển đổi giữa các đơn vị vật lý, ngăn chặn triệt để lỗi tính toán sai lệch đơn vị.', category: '40. Hình ảnh hóa, Toán học & Vật lý (Visualization & Math Simulation)' },
  { name: 'raytracing', size: 5, desc: 'Thư viện chuyên mô phỏng quang học hình học, tính toán đường đi của các tia sáng qua thấu kính và gương.', category: '40. Hình ảnh hóa, Toán học & Vật lý (Visualization & Math Simulation)' },
  { name: 'openmdao', size: 20, desc: 'Framework tối ưu hóa thiết kế đa ngành (NASA), ứng dụng mạnh trong kỹ thuật hàng không vũ trụ.', category: '40. Hình ảnh hóa, Toán học & Vật lý (Visualization & Math Simulation)' },
  { name: 'fluids', size: 8, desc: 'Thư viện tính toán động lực học chất lưu, tính áp suất, lưu lượng chảy của chất lỏng và khí trong đường ống.', category: '40. Hình ảnh hóa, Toán học & Vật lý (Visualization & Math Simulation)' },

  // 41. Tối ưu Phần cứng, Giảm Lag & Tăng tốc tính toán (CPU/GPU Performance)
  { name: 'numba', size: 15, desc: 'Trình biên dịch JIT, tự động dịch các hàm Python thuần túy và toán tử NumPy sang mã máy siêu nhanh.', category: '41. Tối ưu Phần cứng, Giảm Lag & Tăng tốc tính toán (CPU/GPU Performance)' },
  { name: 'cupy', size: 35, desc: 'Giải pháp thay thế hoàn hảo cho NumPy trên GPU NVIDIA CUDA, giúp tăng tốc xử lý mảng lên hàng chục lần.', category: '41. Tối ưu Phần cứng, Giảm Lag & Tăng tốc tính toán (CPU/GPU Performance)' },
  { name: 'taichi', size: 25, desc: 'Ngôn ngữ lập trình hiệu năng cao được nhúng trực tiếp trong Python, chuyên mô phỏng vật lý, đồ họa chạy trên CPU/GPU.', category: '41. Tối ưu Phần cứng, Giảm Lag & Tăng tốc tính toán (CPU/GPU Performance)' },
  { name: 'pycuda', size: 14, desc: 'Cho phép viết code C-CUDA trực tiếp ngay trong script Python để kiểm soát ở cấp độ thấp nhất GPU NVIDIA.', category: '41. Tối ưu Phần cứng, Giảm Lag & Tăng tốc tính toán (CPU/GPU Performance)' },
  { name: 'multiprocessing', size: 1, desc: 'Module tích hợp sẵn giúp vượt qua giới hạn khóa GIL, tận dụng 100% tất cả các lõi CPU vật lý.', category: '41. Tối ưu Phần cứng, Giảm Lag & Tăng tốc tính toán (CPU/GPU Performance)' },

  // 42. Siêu nén, Quản lý Bộ nhớ & Giảm dung lượng (Compression & Memory)
  { name: 'lz4', size: 4, desc: 'Thư viện nén dữ liệu truyền trực tuyến thời gian thực cực nhanh, chú trọng tuyệt đối vào giảm thiểu lag CPU.', category: '42. Siêu nén, Quản lý Bộ nhớ & Giảm dung lượng (Compression & Memory)' },
  { name: 'pympler', size: 5, desc: 'Công cụ giám sát bộ nhớ chuyên sâu, đo đạc dung lượng RAM của từng đối tượng Python và phát hiện rò rỉ bộ nhớ.', category: '42. Siêu nén, Quản lý Bộ nhớ & Giảm dung lượng (Compression & Memory)' },

  // 43. Tối ưu hóa Web, Render HTML & Tăng tốc API (Web Optimization)
  { name: 'uvloop', size: 3, desc: 'Thay thế cho vòng lặp sự kiện mặc định của asyncio, tăng tốc độ xử lý tác vụ I/O bound lên gấp 2-4 lần.', category: '43. Tối ưu hóa Web, Render HTML & Tăng tốc API (Web Optimization)' },
  { name: 'htmlmin', size: 2, desc: 'Tự động thu gọn (minify) mã nguồn HTML, loại bỏ khoảng trắng và xuống dòng thừa giúp tăng tốc độ tải web.', category: '43. Tối ưu hóa Web, Render HTML & Tăng tốc API (Web Optimization)' },
  { name: 'aiofiles', size: 3, desc: 'Cho phép đọc và ghi file trên ổ đĩa dưới dạng bất đồng bộ (async/await), tránh gây block lag server.', category: '43. Tối ưu hóa Web, Render HTML & Tăng tốc API (Web Optimization)' },

  // 44. Xử lý Luồng công việc & Hàng đợi (Task Queues & Caching)
  { name: 'rq', size: 4, desc: 'Redis Queue là giải pháp hàng đợi siêu nhẹ sử dụng Redis để quản lý và chạy các tác vụ nền hiệu quả.', category: '44. Xử lý Luồng công việc & Hàng đợi (Task Queues & Caching)' },
  { name: 'cachetools', size: 2, desc: 'Cung cấp cấu trúc dữ liệu lưu cache phổ biến (LRU, TTL), tránh việc tính toán lại các hàm nặng gây tốn tài nguyên.', category: '44. Xử lý Luồng công việc & Hàng đợi (Task Queues & Caching)' },

  // 45. Thư viện tiện ích, Vui mắt & Code dễ dàng (Utilities & Fun Coding)
  { name: 'art', size: 3, desc: 'Tự động chuyển đổi các chuỗi văn bản thông thường thành các chữ nghệ thuật ASCII cỡ lớn (ASCII Art).', category: '45. Thư viện tiện ích, Vui mắt & Code dễ dàng (Utilities & Fun Coding)' },
  { name: 'pyfiglet', size: 3, desc: 'Tạo chữ nghệ thuật ASCII cỡ lớn (ASCII Art) rất vui mắt khi khởi động ứng dụng dòng lệnh.', category: '45. Thư viện tiện ích, Vui mắt & Code dễ dàng (Utilities & Fun Coding)' },
  { name: 'emoji', size: 2, desc: 'Cho phép chèn trực tiếp các biểu tượng cảm xúc vào chuỗi string bằng code chữ (ví dụ: :thumbs_up: -> 👍).', category: '45. Thư viện tiện ích, Vui mắt & Code dễ dàng (Utilities & Fun Coding)' },
  { name: 'cowsay', size: 2, desc: 'Tạo ra một chú bò bằng ký tự ASCII nói ra dòng chữ mà bạn truyền vào trong code.', category: '45. Thư viện tiện ích, Vui mắt & Code dễ dàng (Utilities & Fun Coding)' },
  { name: 'parse', size: 2, desc: 'Ngược lại với hàm format(), trích xuất dữ liệu từ chuỗi mà không dùng Regex phức tạp.', category: '45. Thư viện tiện ích, Vui mắt & Code dễ dàng (Utilities & Fun Coding)' },
  { name: 'pyjokes', size: 2, desc: 'Giải trí cho lập trình viên, tự động trả về một câu chuyện cười ngẫu nhiên về chủ đề lập trình.', category: '45. Thư viện tiện ích, Vui mắt & Code dễ dàng (Utilities & Fun Coding)' },
  { name: 'bpython', size: 4, desc: 'Giao diện REPL thay thế mặc định, hỗ trợ tự động gợi ý code (auto-complete) như một IDE thu nhỏ.', category: '45. Thư viện tiện ích, Vui mắt & Code dễ dàng (Utilities & Fun Coding)' },
  { name: 'ptpython', size: 4, desc: 'Giao diện REPL thay thế mặc định cao cấp hơn, hỗ trợ tự động gợi ý và thụt lề thông minh.', category: '45. Thư viện tiện ích, Vui mắt & Code dễ dàng (Utilities & Fun Coding)' },

  // 46. Tối ưu Code sâu & Giao diện tối giản (GUI/Web Optimization)
  { name: 'dataclasses', size: 1, desc: 'Tiện ích tích hợp sẵn giúp loại bỏ các đoạn code lặp (boilerplate) khi định nghĩa Class.', category: '46. Tối ưu Code sâu & Giao diện tối giản (GUI/Web Optimization)' },
  { name: 'returns', size: 3, desc: 'Đưa phong cách lập trình hàm (Functional Programming) vào Python, quản lý luồng code lỗi không lạm dụng try/except.', category: '46. Tối ưu Code sâu & Giao diện tối giản (GUI/Web Optimization)' },
  { name: 'dearpygui', size: 10, desc: 'Framework làm GUI Desktop cực nhanh, vẽ trực tiếp bằng GPU, mượt mà không giật lag.', category: '46. Tối ưu Code sâu & Giao diện tối giản (GUI/Web Optimization)' },
  { name: 'taipy', size: 12, desc: 'Tạo ứng dụng web doanh nghiệp có giao diện sang trọng, tối giản và xử lý được lượng dữ liệu lớn.', category: '46. Tối ưu Code sâu & Giao diện tối giản (GUI/Web Optimization)' },
  { name: 'nicegui', size: 8, desc: 'Quản lý giao diện bằng code Python hiển thị trực tiếp trên trình duyệt Web với Material Design.', category: '46. Tối ưu Code sâu & Giao diện tối giản (GUI/Web Optimization)' },
  { name: 'textual', size: 10, desc: 'Mang giao diện đồ họa đẹp lung linh, hỗ trợ hover chuột và chia cột vào trong Terminal.', category: '46. Tối ưu Code sâu & Giao diện tối giản (GUI/Web Optimization)' },
  { name: 'reflex', size: 15, desc: 'Web framework thuần Python giúp xây dựng cả Front-end lẫn Back-end dựa trên React cực kỳ hiện đại.', category: '46. Tối ưu Code sâu & Giao diện tối giản (GUI/Web Optimization)' },

  // 47. Hiệu ứng & Hoạt ảnh nâng cao (UI Animation)
  { name: 'manim', size: 22, desc: 'Thư viện hoạt hình (animation) toán học nổi tiếng do kênh 3Blue1Brown phát triển, đồ họa chuyển động siêu mượt.', category: '47. Hiệu ứng & Hoạt ảnh nâng cao (UI Animation)' },
  { name: 'arcade', size: 12, desc: 'Thư viện 2D có hệ thống xử lý hiệu ứng ánh sáng (lighting), đổ bóng (shadows) và hạt bằng phần cứng rất tinh tế.', category: '47. Hiệu ứng & Hoạt ảnh nâng cao (UI Animation)' },
  { name: 'pygal', size: 5, desc: 'Vẽ biểu đồ dưới dạng file ảnh vector SVG, hỗ trợ hiệu ứng chuyển động lướt chuột (hover animation) sang trọng.', category: '47. Hiệu ứng & Hoạt ảnh nâng cao (UI Animation)' },
  { name: 'matplotlib.animation', size: 3, desc: 'Module của Matplotlib biến các đồ thị tĩnh thành đồ thị chuyển động động theo thời gian thực.', category: '47. Hiệu ứng & Hoạt ảnh nâng cao (UI Animation)' },
  { name: 'moderngl', size: 14, desc: 'Lớp bọc OpenGL hiện đại, tự lập trình hiệu ứng đồ họa 2D/3D nâng cao bằng GPU ở cấp độ chuyên sâu.', category: '47. Hiệu ứng & Hoạt ảnh nâng cao (UI Animation)' },
  { name: 'gizeh', size: 4, desc: 'Vẽ đồ thị vector (đường cong, hình khối) tinh xảo, giao diện hàm rất gọn gàng cho hoạt ảnh chất lượng cao.', category: '47. Hiệu ứng & Hoạt ảnh nâng cao (UI Animation)' },
  { name: 'qtawesome', size: 4, desc: 'Cung cấp hàng ngàn icon tinh tế từ FontAwesome, Material Design vào các ứng dụng PyQt/PySide.', category: '47. Hiệu ứng & Hoạt ảnh nâng cao (UI Animation)' },
  { name: 'vispy', size: 18, desc: 'Tận dụng GPU để render hiệu ứng hình ảnh không gian lớn, vẽ hàng triệu điểm ảnh không giảm khung hình.', category: '47. Hiệu ứng & Hoạt ảnh nâng cao (UI Animation)' },

  // 48. Phát triển Game 2D/3D nhanh chóng (Game Development)
  { name: 'pygame-ce', size: 14, desc: 'Phiên bản cộng đồng cải tiến, tối ưu hiệu năng và sửa lỗi của thư viện Pygame kinh điển làm game 2D.', category: '48. Phát triển Game 2D/3D nhanh chóng (Game Development)' },
  { name: 'ursina', size: 15, desc: 'Framework làm game 3D và 2D siêu dễ dựa trên Panda3D với cú pháp tối giản cực ngắn gọn.', category: '48. Phát triển Game 2D/3D nhanh chóng (Game Development)' },
  { name: 'ppb', size: 6, desc: 'Game engine (pursuedpybear) chú trọng giáo dục và sự đơn giản, thiết kế kịch bản game sạch sẽ và dễ hiểu.', category: '48. Phát triển Game 2D/3D nhanh chóng (Game Development)' },
  { name: 'freegames', size: 5, desc: 'Bộ sưu tập các game kinh điển (Rắn, Pacman, Flappy Bird) viết bằng code Python cực kỳ ngắn gọn.', category: '48. Phát triển Game 2D/3D nhanh chóng (Game Development)' },
  { name: 'panda3d', size: 25, desc: 'Engine làm game 3D chuyên nghiệp do Disney phát triển, mạnh mẽ và ổn định cho game 3D có chiều sâu.', category: '48. Phát triển Game 2D/3D nhanh chóng (Game Development)' },

  // 49. Xử lý Nhạc & Âm thanh chuyên nghiệp (Audio Processing)
  { name: 'pygame.mixer', size: 4, desc: 'Thành phần quản lý âm thanh của Pygame, phát, dừng, trộn nhiều file âm thanh cùng lúc không lag.', category: '49. Xử lý Nhạc & Âm thanh chuyên nghiệp (Audio Processing)' },
  { name: 'playsound', size: 2, desc: 'Thư viện siêu đơn giản chỉ với một dòng code để phát file nhạc âm thanh tự động.', category: '49. Xử lý Nhạc & Âm thanh chuyên nghiệp (Audio Processing)' },
  { name: 'pydub', size: 5, desc: 'Thao tác âm thanh mạnh mẽ: cắt nối nhạc, tăng giảm âm lượng (dB), chuyển đổi định dạng cực ngắn gọn.', category: '49. Xử lý Nhạc & Âm thanh chuyên nghiệp (Audio Processing)' },
  { name: 'sounddevice', size: 8, desc: 'Ghi âm từ micro và phát mảng dữ liệu âm thanh trực tiếp thông qua loa máy tính bằng NumPy độ trễ thấp.', category: '49. Xử lý Nhạc & Âm thanh chuyên nghiệp (Audio Processing)' },
  { name: 'librosa', size: 20, desc: 'Thư viện đỉnh cao phân tích âm thanh, trích xuất nhịp điệu (beat), cao độ (pitch) và đặc trưng âm nhạc cho AI.', category: '49. Xử lý Nhạc & Âm thanh chuyên nghiệp (Audio Processing)' },
  { name: 'soundfile', size: 6, desc: 'Đọc và ghi các file âm thanh chất lượng cao (WAV, FLAC) thành mảng số NumPy chính xác.', category: '49. Xử lý Nhạc & Âm thanh chuyên nghiệp (Audio Processing)' },
  { name: 'gtts', size: 4, desc: 'Thư viện kết nối Google Text-to-Speech chuyển đổi văn bản thành giọng nói tự nhiên (tiếng Việt/Anh).', category: '49. Xử lý Nhạc & Âm thanh chuyên nghiệp (Audio Processing)' },
  { name: 'simpleaudio', size: 4, desc: 'Phát file âm thanh định dạng WAV bất đồng bộ (chạy ngầm không gây đơ giao diện), không phụ thuộc phức tạp.', category: '49. Xử lý Nhạc & Âm thanh chuyên nghiệp (Audio Processing)' },
  { name: 'audioread', size: 4, desc: 'Lớp bọc giúp ứng dụng đọc hầu hết các định dạng mã hóa âm thanh phổ biến trên nhiều hệ điều hành.', category: '49. Xử lý Nhạc & Âm thanh chuyên nghiệp (Audio Processing)' },
  { name: 'mingus', size: 6, desc: 'Thư viện lý thuyết âm nhạc, giúp tạo nốt nhạc, hợp âm và tự động xuất ra file định dạng MIDI bằng code.', category: '49. Xử lý Nhạc & Âm thanh chuyên nghiệp (Audio Processing)' },

  // 50. Trích xuất & Đọc file phổ biến (File Parsers)
  { name: 'pdfplumber', size: 8, desc: 'Chuyên đọc các file PDF chứa cấu trúc phức tạp như các bảng biểu, trích xuất chính xác từng ô dữ liệu.', category: '50. Trích xuất & Đọc file phổ biến (File Parsers)' },
  { name: 'gguf', size: 12, desc: 'Đọc và quản lý các file mô hình AI định dạng .gguf (chạy local siêu nhẹ của các LLM như Llama, Qwen).', category: '50. Trích xuất & Đọc file phổ biến (File Parsers)' },
  { name: 'wave', size: 1, desc: 'Module tích hợp sẵn chuyên dụng để mở và đọc cấu trúc dữ liệu thô (headers, frames) của file âm thanh .wav.', category: '50. Trích xuất & Đọc file phổ biến (File Parsers)' },
  { name: 'mutagen', size: 3, desc: 'Đọc và sửa đổi các thông tin ẩn (Metadata/ID3 tags) của file nhạc như MP3, M4A (ca sĩ, bài hát, album...).', category: '50. Trích xuất & Đọc file phổ biến (File Parsers)' },

  // 51. Bảo mật, Mã hóa & Biến đổi định dạng (Security & Cryptography)
  { name: 'base64', size: 1, desc: 'Module tích hợp sẵn giúp mã hóa/giải mã dữ liệu chuẩn Base64 để truyền dữ liệu nhị phân qua API an toàn.', category: '51. Bảo mật, Mã hóa & Biến đổi định dạng (Security & Cryptography)' },
  { name: 'pdf2image', size: 6, desc: 'Thư viện chuyên dụng chuyển đổi (render) các trang PDF thành các file ảnh PNG/JPEG chất lượng cao.', category: '51. Bảo mật, Mã hóa & Biến đổi định dạng (Security & Cryptography)' },
  { name: 'hashlib', size: 1, desc: 'Module cốt lõi cung cấp thuật toán băm dữ liệu một chiều SHA-256, MD5 để kiểm tra tính toàn vẹn của file.', category: '51. Bảo mật, Mã hóa & Biến đổi định dạng (Security & Cryptography)' },
  { name: 'secure', size: 2, desc: 'Tự động thiết lập các thuộc tính bảo mật nghiêm ngặt chống XSS, Clickjacking cho FastAPI, Flask, Django.', category: '51. Bảo mật, Mã hóa & Biến đổi định dạng (Security & Cryptography)' }
];

const GUIDE_TRANSLATIONS = {
  vi: {
    title: "Hướng Dẫn Sửa Lỗi API & Game",
    closeBtn: "Đồng ý & Đóng",
    noteTitle: "Lưu ý quan trọng:",
    noteDesc: "Khi gặp lỗi trong quá trình chơi game hoặc kết nối API, vui lòng đọc kỹ hướng dẫn khắc phục bên dưới. Tất cả các lỗi runtime phát sinh từ game sẽ được tự động hiển thị trong Console Log nằm ngay dưới màn hình chơi game, đi kèm nút Sửa lỗi (Fix) tự động bằng AI.",
    sections: [
      {
        id: "1",
        title: "Lỗi Xác Thực & Cấu Hình (Authentication & Configuration)",
        color: "text-red-500",
        borderColor: "border-red-500/10",
        bgClass: "bg-red-500/20 text-red-400",
        items: [
          {
            error: "Sai API Key (401 Unauthorized)",
            desc: "Key bị copy thiếu ký tự, dính khoảng trắng, hoặc đã bị xóa trên Dashboard.",
            fix: "Cách sửa: Kiểm tra lại chuỗi Key, xóa khoảng trắng thừa, hoặc tạo một API Key mới hoàn toàn để thay thế."
          },
          {
            error: "Sai Base URL (404 Not Found)",
            desc: "Gọi sai địa chỉ API Endpoint hoặc thiếu các tiền tố bắt buộc như /v1, /v1/chat/completions.",
            fix: "Cách sửa: Đọc kỹ tài liệu của nhà cung cấp để nhập đúng URL (ví dụ: OpenAI là https://api.openai.com, DeepSeek là https://api.deepseek.com)."
          },
          {
            error: "Key Hết Hạn / Bị Khóa (401 Unauthorized)",
            desc: "API Key bị nhà cung cấp vô hiệu hóa do nghi ngờ lộ mã nguồn (ví dụ: lỡ đẩy lên GitHub công khai) hoặc vi phạm chính sách.",
            fix: "Cách sửa: Truy cập trang quản trị thu hồi (Revoke) key cũ, tạo key mới và tuyệt đối không lưu key trực tiếp trong code (dùng file .env)."
          },
          {
            error: "Sai Tên Mô Hình (400 Bad Request)",
            desc: "Nhập sai ký tự tên model (ví dụ: gõ gpt4-o thay vì gpt-4o) hoặc model đó đã lỗi thời và bị nhà cung cấp gỡ bỏ.",
            fix: "Cách sửa: Cập nhật danh sách model mới nhất của nhà cung cấp và sửa lại chính xác chuỗi ký tự định danh model trong code."
          },
          {
            error: "Thiếu Tiêu Đề Cực Đoan (403 Forbidden)",
            desc: "Một số API (như Claude của Anthropic) bắt buộc phải truyền thêm các Header đặc thù như anthropic-version.",
            fix: "Cách sửa: Thêm đầy đủ các tham số Header theo đúng chuẩn mà tài liệu API yêu cầu."
          }
        ]
      },
      {
        id: "2",
        title: "Lỗi Tài Chính & Tài Khoản (Billing & Subscriptions)",
        color: "text-amber-500",
        borderColor: "border-amber-500/10",
        bgClass: "bg-amber-500/20 text-amber-400",
        items: [
          {
            error: "Hết Tiền / Hết Hạn Mức Cước (402 Payment Required hoặc 429 Too Many Requests)",
            desc: "Tài khoản trả trước (Prepaid) hết số dư, hoặc tài khoản trả sau (Postpaid) chạm ngưỡng giới hạn chi tiêu tối đa (Hard Limit) tháng đó.",
            fix: "Cách sửa: Nạp thêm tiền vào tài khoản hoặc tăng giới hạn chi tiêu (Usage Limit) trong phần cài đặt thanh toán của nhà cung cấp."
          },
          {
            error: "Hết Token Miễn Phí (429 Too Many Requests)",
            desc: "Gói Token dùng thử ban đầu khi mới tạo tài khoản đã hết hạn (thường sau 1-3 tháng) hoặc đã bị tiêu thụ hết sạch.",
            fix: "Cách sửa: Liên kết thẻ tín dụng (Visa/Mastercard) vào tài khoản để chuyển sang gói thương mại thương mại chính thức."
          }
        ]
      },
      {
        id: "3",
        title: "Lỗi Giới Hạn Băng Thông (Rate Limits)",
        color: "text-orange-500",
        borderColor: "border-orange-500/10",
        bgClass: "bg-orange-500/20 text-orange-400",
        items: [
          {
            error: "Quá Giới Hạn Lượt Gọi Mỗi Phút - RPM (429 Too Many Requests)",
            desc: "Gửi quá nhiều Request liên tục trong vòng 60 giây vượt ngưỡng của phân hạng tài khoản (Tier).",
            fix: "Cách sửa: Triển khai cơ chế xếp hàng (Queue) cho Request hoặc dùng thuật toán Exponential Backoff (tự động đợi vài giây rồi thử lại tăng dần)."
          },
          {
            error: "Quá Giới Hạn Token Mỗi Phút - TPM (429 Too Many Requests)",
            desc: "Tổng lượng token gửi lên (Prompt) và nhận về (Completion) của tất cả Request trong 1 phút vượt mức cho phép.",
            fix: "Cách sửa: Giảm bớt độ dài dữ liệu đầu vào, giới hạn tham số max_tokens đầu ra, hoặc nạp thêm tiền để nâng cấp lên Tier cao hơn có giới hạn TPM lớn hơn."
          },
          {
            error: "Quá Giới Hạn Lượt Gọi Mỗi Ngày - RPD (429 Too Many Requests)",
            desc: "Thường gặp ở các tài khoản miễn phí hoặc tài khoản Tier thấp khi dùng hết hạn ngạch ngày.",
            fix: "Cách sửa: Nâng cấp tài khoản lên gói trả phí hoặc thiết lập thêm các API Key dự phòng của nhà cung cấp khác để luân phiên hoán đổi (Rotate Keys)."
          }
        ]
      },
      {
        id: "4",
        title: "Lỗi Hạ Tầng & Hệ Thống (Server & Infrastructure)",
        color: "text-purple-500",
        borderColor: "border-purple-500/10",
        bgClass: "bg-purple-500/20 text-purple-400",
        items: [
          {
            error: "Mô Hình Quá Tải (503 Service Unavailable)",
            desc: "Máy chủ của nhà cung cấp AI bị nghẽn cục bộ do lượng người dùng toàn cầu tăng đột biến tại một thời điểm.",
            fix: "Cách sửa: Viết code bắt lỗi (Try/Catch) mã 503 để tự động gửi lại Request sau một khoảng thời gian ngắn, hoặc thiết lập hệ thống tự chuyển hướng sang model/nhà cung cấp dự phòng (Failover)."
          },
          {
            error: "Lỗi Hệ Thống Nội Bộ (500 Internal Server Error)",
            desc: "Lỗi phát sinh từ phía hạ tầng code hoặc cơ sở dữ liệu của chính nhà cung cấp AI.",
            fix: "Cách sửa: Đây là lỗi khách quan, bạn không thể can thiệp. Cách xử lý duy nhất là chờ đợi nhà cung cấp khắc phục và theo dõi trạng thái tại trang Status của họ."
          },
          {
            error: "Hết Thời Gian Phản Hồi (504 Gateway Timeout)",
            desc: "Mô hình xử lý câu hỏi mất quá nhiều thời gian (khi prompt quá dài hoặc logic phức tạp) khiến cổng kết nối mạng bị đóng trước khi có kết quả.",
            fix: "Cách sửa: Tăng thời gian chờ (Timeout) trong cấu hình HTTP Client của bạn lên (ví dụ: tăng từ 30s lên 120s) hoặc chuyển sang sử dụng chế độ truyền dữ liệu thời gian thực (stream: true)."
          }
        ]
      },
      {
        id: "5",
        title: "Lỗi Nội Dung & Token Giới Hạn (Context & Content)",
        color: "text-cyan-500",
        borderColor: "border-cyan-500/10",
        bgClass: "bg-cyan-500/20 text-cyan-400",
        items: [
          {
            error: "Vượt Quá Độ Dài Context Window (400 Bad Request)",
            desc: "Tổng số lượng token của toàn bộ đoạn hội thoại chat gửi lên vượt quá sức chứa tối đa mà mô hình đó hỗ trợ (ví dụ: gửi file tài liệu quá dày).",
            fix: "Cách sửa: Cắt bớt các đoạn hội thoại cũ không quan trọng, sử dụng thuật toán tóm tắt văn bản (Summarization), hoặc chuyển sang dùng mô hình có Context Window lớn hơn."
          },
          {
            error: "Vi Phạm Chính Sách An Toàn (400 Bad Request hoặc Phản hồi rỗng)",
            desc: "Nội dung câu hỏi (Prompt) kích hoạt bộ lọc an toàn của AI (chứa yếu tố bạo lực, mã độc, nhạy cảm, hoặc thông tin độc hại).",
            fix: "Cách sửa: Chỉnh sửa lại câu hỏi theo hướng khách quan, loại bỏ các từ ngữ nhạy cảm, hoặc kiểm tra phản hồi để xử lý giao diện hiển thị tinh tế (tránh bị crash app)."
          }
        ]
      },
      {
        id: "6",
        title: "Lỗi Định Dạng Dữ Liệu (Payload & Formatting)",
        color: "text-teal-500",
        borderColor: "border-teal-500/10",
        bgClass: "bg-teal-500/20 text-teal-400",
        items: [
          {
            error: "Sai Cấu Trúc JSON Gửi Lên (400 Bad Request)",
            desc: "Truyền dữ liệu không đúng định dạng API yêu cầu (ví dụ: tham số temperature yêu cầu số thực 0.0 - 2.0 nhưng lại truyền vào chuỗi chữ \"cao\", hoặc thiếu dấu ngoặc đóng JSON).",
            fix: "Cách sửa: Sử dụng các thư viện validate dữ liệu (như Pydantic trong Python hoặc Zod trong TypeScript) để ép đúng kiểu dữ liệu trước khi gửi lên API."
          },
          {
            error: "Lỗi Stream Kết Nối (Crash Client)",
            desc: "Bật chế độ nhận phản hồi dạng gõ chữ từng ký tự (stream: true) nhưng mã nguồn phía Client chỉ đọc dữ liệu một lần như Request thông thường, dẫn đến lỗi bất đồng bộ.",
            fix: "Cách sửa: Cấu hình Client xử lý bất đồng bộ theo luồng dữ liệu liên tục (EventSource đối với Web, hoặc sử dụng vòng lặp for await để đọc từng chunk text trả về)."
          },
          {
            error: "Sai Định Dạng Phản Hồi JSON (JSON Mode Error)",
            desc: "Yêu cầu mô hình trả về định dạng JSON thuần (response_format: {\"type\": \"json_object\"}) nhưng trong Prompt lại không có từ khóa ép buộc AI viết dưới dạng JSON.",
            fix: "Cách sửa: Thêm chỉ dẫn rõ ràng vào System Prompt (ví dụ: \"Bạn phải luôn trả về dữ liệu dưới định dạng JSON hợp lệ\")."
          }
        ]
      }
    ]
  },
  en: {
    title: "API & Game Error Resolution Guide",
    closeBtn: "Understand & Close",
    noteTitle: "Important Note:",
    noteDesc: "When encountering issues during gameplay or API connections, please read the troubleshooting guide below. All runtime errors originating from the game will be automatically printed to the Console Log located right below the game window, which also provides an automatic AI-powered Fix button.",
    sections: [
      {
        id: "1",
        title: "Authentication & Configuration",
        color: "text-red-500",
        borderColor: "border-red-500/10",
        bgClass: "bg-red-500/20 text-red-400",
        items: [
          {
            error: "Incorrect API Key (401 Unauthorized)",
            desc: "The key was copied incompletely, contains extra spaces, or has been deleted from the Dashboard.",
            fix: "Fix: Double-check the Key string, remove any leading/trailing spaces, or generate a completely new API Key."
          },
          {
            error: "Incorrect Base URL (404 Not Found)",
            desc: "Calling the incorrect API Endpoint address or missing required prefixes such as /v1 or /v1/chat/completions.",
            fix: "Fix: Review the provider's documentation and input the correct URL (e.g., OpenAI is https://api.openai.com, DeepSeek is https://api.deepseek.com)."
          },
          {
            error: "Expired / Revoked Key (401 Unauthorized)",
            desc: "The API Key was deactivated by the provider due to potential leaks (e.g., accidentally pushed to a public GitHub repository) or violation of policies.",
            fix: "Fix: Go to the admin console, revoke the compromised key, create a new one, and avoid committing keys directly to code (use .env files)."
          },
          {
            error: "Incorrect Model Name (400 Bad Request)",
            desc: "Entering the wrong model identifier characters (e.g., typing gpt4-o instead of gpt-4o) or using an outdated model that has been retired.",
            fix: "Fix: Check the provider's current model list and correct the model identifier string in your configuration."
          },
          {
            error: "Missing Required Headers (403 Forbidden)",
            desc: "Some APIs (like Anthropic's Claude) mandate custom headers like anthropic-version.",
            fix: "Fix: Include all required custom headers in accordance with the API specifications."
          }
        ]
      },
      {
        id: "2",
        title: "Billing & Subscriptions",
        color: "text-amber-500",
        borderColor: "border-amber-500/10",
        bgClass: "bg-amber-500/20 text-amber-400",
        items: [
          {
            error: "Insufficient Balance / Credit Limit (402 Payment Required or 429 Too Many Requests)",
            desc: "Prepaid accounts ran out of balance, or postpaid accounts hit their maximum hard limit spend for the month.",
            fix: "Fix: Top up your account balance or increase the usage limit under the provider's billing settings."
          },
          {
            error: "Free Token Quota Expired (429 Too Many Requests)",
            desc: "The initial trial credits provided upon sign-up have expired (typically after 1-3 months) or have been fully exhausted.",
            fix: "Fix: Link a payment method (Visa/Mastercard) to transition your account to a commercial tier."
          }
        ]
      },
      {
        id: "3",
        title: "Rate Limits",
        color: "text-orange-500",
        borderColor: "border-orange-500/10",
        bgClass: "bg-orange-500/20 text-orange-400",
        items: [
          {
            error: "Requests Per Minute - RPM Exceeded (429 Too Many Requests)",
            desc: "Sending too many requests in rapid succession within 60 seconds, exceeding your account tier's allowance.",
            fix: "Fix: Implement a request queue or utilize an exponential backoff algorithm (automatically wait and retry with increasing intervals)."
          },
          {
            error: "Tokens Per Minute - TPM Exceeded (429 Too Many Requests)",
            desc: "The total token volume sent (Prompt) and received (Completion) across all requests within a minute exceeded limits.",
            fix: "Fix: Shorten input data, limit the max_tokens parameter, or upgrade to a higher tier with larger TPM allocations."
          },
          {
            error: "Requests Per Day - RPD Exceeded (429 Too Many Requests)",
            desc: "Commonly encountered on free or low-tier accounts once the daily quota has been fully consumed.",
            fix: "Fix: Upgrade to a paid plan or set up fallback API Keys from other providers to rotate keys dynamically."
          }
        ]
      },
      {
        id: "4",
        title: "Server & Infrastructure",
        color: "text-purple-500",
        borderColor: "border-purple-500/10",
        bgClass: "bg-purple-500/20 text-purple-400",
        items: [
          {
            error: "Model Overloaded (503 Service Unavailable)",
            desc: "The AI provider's servers are experiencing temporary congestion due to a global surge in traffic.",
            fix: "Fix: Use try-catch blocks to catch status code 503 and automatically retry after a short delay, or implement a fallback system to direct requests to an alternative model or provider."
          },
          {
            error: "Internal Server Error (500 Internal Server Error)",
            desc: "An internal issue occurred within the AI provider's hosting infrastructure or database.",
            fix: "Fix: This is a provider-side issue; you cannot fix it programmatically. The only recourse is to check their Status page and wait for resolution."
          },
          {
            error: "Gateway Timeout (504 Gateway Timeout)",
            desc: "The model took too long to complete the request (often with very long prompts or complex logical instructions), causing the network connection to close.",
            fix: "Fix: Increase your HTTP client timeout limit (e.g., from 30s to 120s) or switch to real-time streaming mode (stream: true)."
          }
        ]
      },
      {
        id: "5",
        title: "Context & Content Limits",
        color: "text-cyan-500",
        borderColor: "border-cyan-500/10",
        bgClass: "bg-cyan-500/20 text-cyan-400",
        items: [
          {
            error: "Context Window Exceeded (400 Bad Request)",
            desc: "The total token count of the active dialogue history exceeds the maximum context capacity of the chosen model.",
            fix: "Fix: Prune or summarize earlier dialogue, utilize summarization algorithms, or switch to a model supporting a larger context window."
          },
          {
            error: "Safety Policy Violation (400 Bad Request or Empty Response)",
            desc: "The prompt triggered the AI provider's safety filters (such as containing sensitive, harmful, or policy-violating language).",
            fix: "Fix: Rephrase your inputs neutrally, remove sensitive keywords, and handle empty responses gracefully in the UI."
          }
        ]
      },
      {
        id: "6",
        title: "Payload & Formatting",
        color: "text-teal-500",
        borderColor: "border-teal-500/10",
        bgClass: "bg-teal-500/20 text-teal-400",
        items: [
          {
            error: "Malformed JSON Structure (400 Bad Request)",
            desc: "Sending payloads that do not match the required API parameters structure (e.g., setting temperature to a string 'high' instead of a float 0.0-2.0, or syntax errors in JSON).",
            fix: "Fix: Validate input structures before dispatching (using libraries like Zod in TypeScript or Pydantic in Python)."
          },
          {
            error: "Streaming Connection Interruption (Client Crash)",
            desc: "Setting stream: true but the client code reads the response as a single standard resolution payload, causing asynchronous mismatches.",
            fix: "Fix: Configure client code to read sequential data chunks continuously (e.g., using EventSource on Web, or a 'for await' loop over chunks)."
          },
          {
            error: "Invalid JSON Response Format (JSON Mode Error)",
            desc: "Requesting JSON output mode (response_format: {'{\x22type\x22: \x22json_object\x22}'}) without explicitly instructing the model to generate valid JSON.",
            fix: "Fix: Include a clear instruction in the system prompt (e.g., 'You must return output strictly formatted as valid JSON')."
          }
        ]
      }
    ]
  }
};

const openedCodeBlocks = new Set<string>();

const CollapsibleCodeBlock = ({ node, className, children, theme, ...props }: any) => {
  const match = /language-(\w+)/.exec(className || '');
  const codeString = typeof children === 'string' ? children : '';
  const signature = codeString.length > 100 ? codeString.substring(0, 100) : codeString;

  const [isOpen, setIsOpen] = useState(() => {
    if (!signature) return false;
    return openedCodeBlocks.has(signature);
  });

  useEffect(() => {
    if (signature) {
      setIsOpen(openedCodeBlocks.has(signature));
    }
  }, [signature]);

  const toggleOpen = () => {
    const next = !isOpen;
    setIsOpen(next);
    if (signature) {
      if (next) {
        openedCodeBlocks.add(signature);
      } else {
        openedCodeBlocks.delete(signature);
      }
    }
  };

  const hasNewline = typeof children === 'string' && children.includes('\n');
  const isInline = props.inline !== undefined ? props.inline : (!match && !hasNewline);

  if (!isInline) {
    const isDark = theme === 'dark';
    return (
      <div className={`my-2 rounded overflow-hidden border ${
        isDark 
          ? 'bg-slate-950 border-slate-800' 
          : 'bg-white border-slate-200'
      }`}>
        <div className={`flex justify-between items-center px-3 py-1.5 font-mono text-[10px] border-b ${
          isDark 
            ? 'bg-slate-900 border-slate-800 text-slate-400' 
            : 'bg-white border-slate-200 text-slate-500'
        }`}>
          <span>{match ? match[1] : 'code'}</span>
          <button 
            onClick={toggleOpen} 
            className={`font-semibold cursor-pointer transition-colors ${
              isDark ? 'text-indigo-400 hover:text-white' : 'text-indigo-600 hover:text-indigo-800'
            }`}
          >
            {isOpen ? 'Ẩn code (Hide)' : 'Xem thêm code (Show more)'}
          </button>
        </div>
        {isOpen && (
          <div className={`p-3 overflow-x-auto text-xs ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
            <code className={className} {...props}>
              {children}
            </code>
          </div>
        )}
      </div>
    );
  }
  return (
    <code className={`${className || ''} ${theme === 'dark' ? 'bg-slate-850 text-slate-300' : 'bg-slate-100 text-slate-800'} px-1 py-0.5 rounded text-xs`} {...props}>
      {children}
    </code>
  );
};

const parseThinkAndText = (text: string): { thinkText: string; remainingText: string } => {
  if (!text) return { thinkText: '', remainingText: '' };

  let thinkText = '';
  let remainingText = text;

  // Pattern 1: completed <think>...</think> or <thinking>...</thinking>
  const thinkRegex = /<(think|thinking)>([\s\S]*?)<\/(think|thinking)>/gi;
  let match;
  const matches: string[] = [];
  
  while ((match = thinkRegex.exec(text)) !== null) {
    matches.push(match[2]);
  }

  if (matches.length > 0) {
    thinkText = matches.join('\n\n');
    remainingText = text.replace(thinkRegex, '');
  } else {
    // Pattern 2: unclosed tag <think> or <thinking>
    const openIndex = text.search(/<(think|thinking)>/i);
    if (openIndex !== -1) {
      const tagMatch = text.match(/<(think|thinking)>/i);
      if (tagMatch) {
        const tagLength = tagMatch[0].length;
        thinkText = text.substring(openIndex + tagLength);
        remainingText = text.substring(0, openIndex);
      }
    }
  }

  return {
    thinkText: thinkText.trim(),
    remainingText: remainingText.trim()
  };
};

const ModelMessageContent = ({ 
  text, 
  theme, 
  lang, 
  CollapsibleCodeBlock 
}: { 
  text: string; 
  theme: string; 
  lang: string; 
  CollapsibleCodeBlock: any;
}) => {
  const { thinkText, remainingText } = parseThinkAndText(text);
  const [showThink, setShowThink] = useState(false);

  return (
    <div className="flex flex-col gap-2 w-full">
      {thinkText && (
        <div className={`rounded-xl border text-xs overflow-hidden transition-all duration-200 ${
          theme === 'dark' 
            ? 'bg-slate-900/60 border-slate-750' 
            : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center justify-between px-3 py-2 select-none bg-slate-500/5">
            <div className="flex items-center gap-2 text-slate-400 font-semibold">
              <Brain className="w-4 h-4 text-indigo-400 animate-pulse" />
              <span>{lang === 'vi' ? 'Suy nghĩ của AI (Thinking)' : 'AI Thinking Process'}</span>
            </div>
            <button
              onClick={() => setShowThink(!showThink)}
              className={`text-xs font-bold px-2.5 py-1 rounded-md cursor-pointer hover:bg-slate-500/10 transition-colors ${
                theme === 'dark' ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'
              }`}
            >
              {showThink 
                ? (lang === 'vi' ? 'Ẩn (Hide)' : 'Hide') 
                : (lang === 'vi' ? 'Xem (Show)' : 'Show')
              }
            </button>
          </div>
          {showThink && (
            <div className={`p-3 font-mono border-t border-dashed leading-relaxed markdown-body max-h-72 overflow-y-auto ${
              theme === 'dark' 
                ? 'border-slate-800 text-slate-400 bg-slate-950/30' 
                : 'border-slate-250 text-slate-500 bg-white/70'
            }`}>
              <Markdown remarkPlugins={[remarkGfm]}>
                {thinkText}
              </Markdown>
            </div>
          )}
        </div>
      )}
      
      <div className="markdown-body">
        <Markdown 
          remarkPlugins={[remarkGfm]}
          components={{
            pre: ({ children }: any) => <>{children}</>,
            code: (props: any) => <CollapsibleCodeBlock {...props} theme={theme} />
          }}
        >
          {remainingText}
        </Markdown>
      </div>
    </div>
  );
};

const STORAGE_KEY = 'ai_studio_projects';
const THEME_KEY = 'ai_studio_theme';

export const DEFAULT_RULES: InstructionRule[] = [
  {
    id: "multiFile",
    name: "Dự án Đa file (Project VFS)",
    type: "primary",
    content: "- Project: \"Full Version\" Virtual File System (VFS). Multi-file development is highly encouraged! For this full version, you should split your code into as many files as possible (e.g., separate files for components, visual styling, logic, helper functions, configurations, assets, state management) instead of placing everything in a single index.html. Try to design clean, modular file architectures with multiple separate, well-named files. The more files you create to organize the codebase, the better! (Hãy luôn chia nhỏ code thành nhiều file nhất có thể để sạch sẽ và dễ nâng cấp!)"
  },
  {
    id: "antiCrash",
    name: "Chống Sập (Anti-Crash)",
    type: "primary",
    content: "- Anti-Crash: NEVER use alert(), confirm(), prompt(). Create custom HTML/CSS/JS UI/Modals instead."
  },
  {
    id: "security",
    name: "Bảo Mật (Security)",
    type: "primary",
    content: "- Security: STRICTLY FORBIDDEN to access or call 'window.top' or 'window.parent' (iframe sandbox protection)."
  },
  {
    id: "safeStorage",
    name: "Bộ Nhớ An Toàn (Safe Storage)",
    type: "primary",
    content: "- Safe Storage: You are free to use localStorage or sessionStorage for persistence. However, when running in the preview sandbox, you must save and maintain game configuration/state (e.g., coins, score, win, settings) in a dedicated data file named 'test.data.safe' in JSON format (e.g., { \"coins\": 10, \"win\": 100 }). This ensures other files can always modify, read, and write this file to achieve the most accurate and consistent persistence within the sandbox."
  },
  {
    id: "languageRule",
    name: "Ngôn Ngữ & Ngôn Ngữ Lập Trình (Language & Coding)",
    type: "primary",
    content: "- Language & Coding:\n1. 100% ENGLISH ONLY inside code (HTML, CSS, JS, comments, variables, classes, UI labels). No Vietnamese.\n2. You are fully capable of writing and supporting HTML, CSS, JavaScript (JS), TypeScript (TS), TSX (React), and Python (PY) code. Do NOT argue that you can only write JavaScript or cannot write Python/TypeScript.\n3. If the user asks you to write Python code, you can use the command [!findlibrary:library_name] (you should search with the first 3 characters of the library to find more related options) to check if the library is available in the local database. This helps the user download and import it into their Python application/game."
  },
  {
    id: "vfsTagRules",
    name: "Thẻ Cập Nhật File (VFS Tag Rules)",
    type: "primary",
    content: "- VFS Tag Rules (MANDATORY for file changes, NO free code outside blocks):\n1. Add file: [!createnew file:path_to_file]\n```\ncontent\n```\n2. Edit full file: [!editfile:path_to_file]\n```\nupdated_content\n```\n3. Delete file: [!deletefile:path_to_file]\n4. Read file content: [!readfile:path_to_file]\n5. Check Python library: [!findlibrary:library_name] (search using the first 3 characters of the library name to get broader results, e.g., [!findlibrary:pyg] to look for Pygame, Arcade...)\n(If you need to read the content of any file to understand or modify it, output [!readfile:path_to_file] and wait for the system to reply with the file contents. Do NOT guess file content or edit blindly! If writing Python code and you need to see if a package is available, use [!findlibrary:library_name] to scan the database.)\nCRITICAL negative constraint: Do NOT wrap the entire response or multiple VFS tag blocks inside an outer ```html or ```xml markdown code block! Each VFS block should stand on its own at the root of the output. Never double-wrap blocks."
  },
  {
    id: "structureRules",
    name: "Cấu Trúc Dự Án (Structure Rules)",
    type: "primary",
    content: "- Structure Rules:\n+ 'index.html': Main entry file.\n+ 'metadata.json': Game metadata only: {\"name\": \"...\", \"description\": \"...\"}\n+ 'readme.md': ONLY contain file list and specific change logs (file paths and exact edit locations). No generic text."
  },
  {
    id: "outputFlow",
    name: "Luồng Đầu Ra (Output Flow)",
    type: "primary",
    content: "- Output Flow: Brief 1-2 sentences explanation first -> Use exact VFS tags to create/update -> Output FULL complete source code for changed files."
  },
  {
    id: "layout",
    name: "Bố Cục Ngang (Layout)",
    type: "secondary",
    content: "- Layout: Mini horizontal/landscape HTML/JS games. Use horizontal scroll/drag if content overflows."
  },
  {
    id: "responseRule",
    name: "Đầu Ra Thẻ Html (Response Rule)",
    type: "secondary",
    content: "- Response Rule: If isCodingRequest is true, give a 1-2 sentence summary first, then output the entire standalone code inside a single ```html ... ``` block."
  },
  {
    id: "uiUxTheme",
    name: "Chủ Đề Giao Diện (UI/UX Theme)",
    type: "secondary",
    content: "- UI/UX Theme: Mobile-first responsive design. Touch-friendly buttons (min size 44x44px, safe padding)."
  },
  {
    id: "virtualControls",
    name: "Điều Khiển Ảo (Virtual Controls)",
    type: "secondary",
    content: "- Virtual Controls: Add on-screen virtual joystick, D-Pad, action buttons, or phone tilt/drag simulation if game requires controller."
  },
  {
    id: "visuals",
    name: "Đồ Họa & Màu Sắc (Visuals)",
    type: "secondary",
    content: "- Visuals: Use modern clean CSS (Flexbox/Grid), smooth animations (CSS transitions/transforms), and high-contrast color themes."
  },
  {
    id: "assetHandling",
    name: "Xử Lý Tài Nguyên (Asset Handling)",
    type: "secondary",
    content: "- Asset Handling: Use purely procedural generation (HTML Canvas, CSS shapes, SVG) or safe open-source external assets."
  },
  {
    id: "inputMocking",
    name: "Mô Phỏng Đầu Vào (Input Mocking)",
    type: "secondary",
    content: "- Input Mocking: Support mouse/touch coordinate mapping, right/left click simulation, and custom touch-and-drag listeners"
  }
];

const generateId = () => Math.random().toString(36).substring(2, 9);

function computeLineDiff(oldStr: string, newStr: string) {
  const oldLines = (oldStr || "").split('\n');
  const newLines = (newStr || "").split('\n');
  const m = oldLines.length;
  const n = newLines.length;
  
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  
  const result: { type: 'added' | 'removed' | 'unchanged', value: string }[] = [];
  let i = m;
  let j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      result.unshift({ type: 'unchanged', value: oldLines[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ type: 'added', value: newLines[j - 1] });
      j--;
    } else {
      result.unshift({ type: 'removed', value: oldLines[i - 1] });
      i--;
    }
  }
  return result;
}

const cleanThinkingText = (text: string) => {
  const { remainingText } = parseThinkAndText(text);
  return remainingText;
};

function generateLocalThemesFallback(prompt: string, projects?: { name: string }[]) {
  const cleanTitle = prompt
    .replace(/(Tạo game|làm game|Tạo trò chơi|Xây dựng|Tạo|Làm|Build|Create|Game|bắn súng)/gi, '')
    .trim() || "Retro Game";
    
  const activeProjects = projects && projects.length > 0 ? projects.slice(0, 3) : [{ name: cleanTitle }];

  const Neon = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {
          background-color: #030712;
          color: #f3f4f6;
          margin: 0;
          padding: 10px;
          font-family: monospace;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          overflow: auto;
        }
        .container {
          border: 2px solid #ec4899;
          border-radius: 12px;
          padding: 16px;
          min-width: 250px;
          width: fill-available;
          max-width: 380px;
          background: rgba(0,0,0,0.85);
          box-shadow: 0 0 15px rgba(236, 72, 153, 0.5);
          text-align: center;
        }
        h1 {
          color: #f472b6;
          font-size: 1.1rem;
          margin-bottom: 8px;
          text-transform: uppercase;
        }
        .badge {
          display: inline-block;
          background: rgba(236,72,153,0.1);
          border: 1px solid rgba(236,72,153,0.3);
          color: #22d3ee;
          font-size: 9px;
          padding: 2px 6px;
          border-radius: 4px;
          margin-bottom: 8px;
        }
        .stats {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin: 10px 0;
        }
        .stat-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(49, 46, 129, 0.4);
          padding: 6px 8px;
          border-radius: 4px;
          border: 1px solid rgba(99, 102, 241, 0.2);
          text-align: left;
        }
        .stat-label {
          font-size: 8px;
          color: #818cf8;
          text-transform: uppercase;
        }
        .stat-val {
          font-size: 8px;
          font-weight: bold;
          color: #22d3ee;
        }
        button {
          width: 100%;
          padding: 8px;
          background: linear-gradient(to right, #ec4899, #6366f1);
          border: none;
          color: white;
          border-radius: 6px;
          font-weight: bold;
          font-size: 10px;
          cursor: pointer;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>${cleanTitle}</h1>
        <div class="badge">NEON ACTIVE STUDIO</div>
        <div class="stats">
          ${activeProjects.map(p => `
            <div class="stat-card">
              <span class="stat-label">${p.name}</span>
              <span class="stat-val">ACTIVE</span>
            </div>
          `).join('')}
        </div>
        <button>START SIMULATOR</button>
      </div>
    </body>
    </html>
  `;

  const Clean = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {
          background-color: #ffffff;
          color: #18181b;
          margin: 0;
          padding: 10px;
          font-family: system-ui, sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          overflow: auto;
        }
        .container {
          border: 1px solid #e4e4e7;
          border-radius: 6px;
          padding: 16px;
          min-width: 250px;
          max-width: 380px;
          background: #fdfdfd;
          text-align: center;
        }
        h1 {
          font-size: 1.1rem;
          font-weight: 300;
          letter-spacing: 2px;
          border-bottom: 1px solid #e4e4e7;
          padding-bottom: 6px;
          margin-bottom: 10px;
          text-transform: uppercase;
        }
        p {
          font-size: 8px;
          color: #a1a1aa;
          letter-spacing: 1px;
          text-transform: uppercase;
          margin: 0 0 10px;
        }
        .box {
          background: white;
          border: 1px solid #e4e4e7;
          border-radius: 4px;
          padding: 8px;
          font-size: 9px;
          text-align: left;
          color: #71717a;
          margin-bottom: 10px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .project-row {
          display: flex;
          justify-content: space-between;
          border-bottom: 1px dashed #f4f4f5;
          padding-bottom: 2px;
        }
        .project-row:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }
        button {
          width: 100%;
          padding: 8px;
          background: #000;
          color: #fff;
          border: none;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 1px;
          cursor: pointer;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>${cleanTitle}</h1>
        <p>Clean Studio Mode</p>
        <div class="box">
          ${activeProjects.map(p => `
            <div class="project-row">
              <span>• ${p.name}</span>
              <span style="font-size: 7px; color: #a1a1aa;">Ready</span>
            </div>
          `).join('')}
        </div>
        <button>Run Simulator</button>
      </div>
    </body>
    </html>
  `;

  const Light = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {
          background-color: #f8fafc;
          color: #334155;
          margin: 0;
          padding: 10px;
          font-family: system-ui, sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          overflow: auto;
        }
        .container {
          background: #ffffff;
          border: 1px solid #f1f5f9;
          border-radius: 12px;
          box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05);
          padding: 16px;
          min-width: 250px;
          max-width: 380px;
          text-align: center;
        }
        .emoji {
          width: 28px;
          height: 28px;
          background: #fef3c7;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 8px;
          font-size: 14px;
        }
        h1 {
          font-size: 1.1rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 4px;
        }
        .subtitle {
          font-size: 10px;
          color: #4f46e5;
          font-weight: 600;
          margin-bottom: 10px;
        }
        .desc {
          background: #f8fafc;
          padding: 8px;
          border-radius: 6px;
          font-size: 9px;
          text-align: left;
          color: #64748b;
          margin-bottom: 10px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .project-item {
          display: flex;
          justify-content: space-between;
        }
        button {
          width: 100%;
          padding: 8px;
          background: #4f46e5;
          color: white;
          border: none;
          font-weight: 600;
          font-size: 10px;
          border-radius: 6px;
          cursor: pointer;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>${cleanTitle}</h1>
        <div class="subtitle">Bright Landscape Registry</div>
        <div class="desc">
          ${activeProjects.map(p => `
            <div class="project-item">
              <span style="color: #475569;">${p.name}</span>
              <span style="color: #10b981; font-weight: 600;">v1.0</span>
            </div>
          `).join('')}
        </div>
        <button>Launch Room</button>
      </div>
    </body>
    </html>
  `;

  const Dark = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {
          background-color: #0f172a;
          color: #cbd5e1;
          margin: 0;
          padding: 10px;
          font-family: system-ui, sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          overflow: auto;
        }
        .container {
          background: rgba(30, 41, 59, 0.85);
          border: 1px solid rgba(51, 65, 85, 0.5);
          border-radius: 12px;
          padding: 16px;
          min-width: 250px;
          max-width: 380px;
          text-align: center;
        }
        h1 {
          font-size: 1.1rem;
          font-weight: 700;
          color: #ffffff;
          margin: 0 0 6px;
        }
        .line {
          height: 2px;
          width: 24px;
          background: #6366f1;
          margin: 0 auto 10px;
          border-radius: 2px;
        }
        .hud-label {
          font-size: 8px;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 1.2px;
          margin-bottom: 10px;
        }
        .metrics {
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid #334155;
          border-radius: 6px;
          padding: 8px;
          margin-bottom: 10px;
          font-size: 9px;
          text-align: left;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .metric-row {
          display: flex;
          justify-content: space-between;
        }
        .green {
          color: #10b981;
          font-weight: bold;
        }
        button {
          width: 100%;
          padding: 8px;
          background: #4f46e5;
          color: white;
          border: 1px solid rgba(99, 102, 241, 0.2);
          border-radius: 6px;
          font-size: 10px;
          font-weight: 600;
          cursor: pointer;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>${cleanTitle}</h1>
        <div class="line"></div>
        <div class="hud-label">Sleek Dashboard Registry</div>
        <div class="metrics">
          ${activeProjects.map(p => `
            <div class="metric-row">
              <span>${p.name}</span>
              <span class="green">LIVE</span>
            </div>
          `).join('')}
        </div>
        <button>Run Console</button>
      </div>
    </body>
    </html>
  `;

  return { 
    Neon, 
    Clean, 
    Light, 
    Dark,
    metadata: {
      name: cleanTitle,
      description: `A beautiful design system for ${cleanTitle}`,
      idea: `Build a highly polished, responsive game focusing on smooth performance and visual delight around the theme of ${cleanTitle}.`,
      fileStructure: ["index.html", "metadata.json", "readme.md", "js/game.js", "css/style.css"],
      filesLogic: [
        { path: "index.html", logic: "Game layout structure and view elements", purpose: "Application container" },
        { path: "js/game.js", logic: "Core gameplay loop, inputs and animations", purpose: "Core game logic" },
        { path: "css/style.css", logic: "Tailwind responsive style rules", purpose: "Visual theme appearance" }
      ]
    },
    readme: `# ${cleanTitle} Game Blueprint\n\nThis blueprint specifies the basic architecture of the game. It is designed to be fully customizable, highly polished, and fully responsive across devices.`
  };
}

interface Provider {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
}

interface ModelItem {
  name: string;
  providerId: string;
  taskType?: string;
}

const MODEL_TASK_TYPES = [
  "Multimodal",
  "Audio-Text-to-Text",
  "Image-Text-to-Text",
  "Image-Text-to-Image",
  "Image-Text-to-Video",
  "Visual Question Answering",
  "Document Question Answering",
  "Video-Text-to-Text",
  "Visual Document Retrieval",
  "Any-to-Any",
  "Computer Vision",
  "Depth Estimation",
  "Image Classification",
  "Object Detection",
  "Image Segmentation",
  "Text-to-Image",
  "Image-to-Text",
  "Image-to-Image",
  "Image-to-Video",
  "Unconditional Image Generation",
  "Video Classification",
  "Text-to-Video",
  "Zero-Shot Image Classification",
  "Mask Generation",
  "Zero-Shot Object Detection",
  "Text-to-3D",
  "Image-to-3D",
  "Image Feature Extraction",
  "Keypoint Detection",
  "Video-to-Video",
  "Natural Language Processing",
  "Text Classification",
  "Token Classification",
  "Table Question Answering",
  "Question Answering",
  "Zero-Shot Classification",
  "Translation",
  "Summarization",
  "Feature Extraction",
  "Text Generation",
  "Fill-Mask",
  "Sentence Similarity",
  "Text Ranking",
  "Audio",
  "Text-to-Speech",
  "Text-to-Audio",
  "Automatic Speech Recognition",
  "Audio-to-Audio",
  "Audio Classification",
  "Voice Activity Detection",
  "Tabular",
  "Tabular Classification",
  "Tabular Regression",
  "Time Series Forecasting",
  "Reinforcement Learning",
  "Robotics",
  "Other",
  "Graph Machine Learning"
];

const getGlobalSystemInstruction = (): string => {
  try {
    const saved = localStorage.getItem('global_system_instruction');
    if (saved && saved.includes('findlibrary')) return saved;
  } catch (e) {}
  const primaryRules = DEFAULT_RULES
    .filter(r => r.type === 'primary')
    .map(r => r.content.trim())
    .filter(Boolean)
    .join('\n\n');
  try {
    localStorage.setItem('global_system_instruction', primaryRules);
  } catch (e) {}
  return primaryRules;
};

const getGlobalThemeInstruction = (): string => {
  try {
    const saved = localStorage.getItem('global_theme_instruction');
    if (saved) return saved;
  } catch (e) {}
  return DEFAULT_RULES
    .filter(r => r.type === 'secondary')
    .map(r => r.content.trim())
    .filter(Boolean)
    .join('\n\n');
};

const getGlobalCustomModel = (): string => {
  try {
    return localStorage.getItem('global_custom_model') || '';
  } catch (e) {
    return '';
  }
};

const getGlobalAdditionalSystemInstruction = (): string => {
  try {
    return localStorage.getItem('global_additional_system_instruction') || '';
  } catch (e) {
    return '';
  }
};

const translations = {
  vi: {
    settings: "Cài đặt hệ thống",
    projectName: "Tên dự án",
    darkMode: "Giao diện tối (Dark Mode)",
    darkModeOn: "Đang bật Dark Mode",
    lightModeOn: "Đang bật Light Mode",
    systemInstructions: "Chỉ thị bổ sung (System Instructions)",
    primaryKey: "Gemini API Key (Chính)",
    primaryPlaceholder: "Nhập API Key để sinh code chính (fallback về Env Key nếu trống)...",
    secondaryKey: "Gemini API Key (Phụ)",
    secondaryPlaceholder: "Nhập API Key để sinh nhanh 4 giao diện Neon/Clean/Light/Dark...",
    modelSelection: "Danh sách Model khả dụng",
    addModelBtn: "Thêm model",
    addModelPlaceholder: "Nhập tên model (ví dụ: gemini-2.0-pro-exp)...",
    safetyMode: "Chế độ an toàn khi tương tác (Safe Mode)",
    safetyEnabledTip: "Bật chế độ an toàn: Giới hạn tối đa 3 dự án đồng thời, xóa dự án bắt buộc gõ lại tên để xác thực.",
    safetyDisabledTip: "Tắt chế độ an toàn: Giới hạn tối đa 10 dự án. Tự dọn dẹp dự án cũ hơn sau mỗi 100s nếu quá tải. Xóa chỉ cần tích xác nhận.",
    securityTitle: "Bảo mật thiết bị & Không lộ API",
    securityDesc: "Mọi cấu hình (API chính, API phụ, System Instructions, Custom Model) chỉ lưu riêng trên ổ đĩa trình duyệt (localStorage) của bạn. Không lưu trữ trên server, loại bỏ 100% rủi ro lộ khóa cá nhân.",
    deleteProject: "Xóa vĩnh viễn dự án này",
    dangerZone: "Vùng nguy hiểm (Danger Zone)",
    confirmDeleteTitle: "Xác nhận xóa dự án?",
    confirmDeleteDesc: "Hành động này không thể hoàn tác. Để xác nhận, viết đúng tên \"{name}\" dưới đây.",
    confirmDeleteCheckboxDesc: "Tôi hoàn toàn xác nhận và đồng ý xóa vĩnh viễn dự án.",
    cancel: "Hủy bỏ",
    delete: "Xóa ngay",
    maxProjectsAlert: "Bạn đã vượt hạn mức số dự án tối đa cho phép. Hãy nâng cấp hạn mức bằng cách tắt Chế độ an toàn trong Cài đặt hoặc xóa bớt dự án cũ!",
    unusedCleanupMsg: "Hệ thống tự động dọn dẹp các dự án không sử dụng trong 30 ngày qua để tối ưu hóa bộ nhớ.",
    selectModel: "Chọn Model chính để sinh code...",
    languageSelection: "Ngôn ngữ hiển thị (Language)",
    projectsCountLabel: "Số lượng dự án:",
    providersTitle: "Danh sách Bên Cung Cấp API đã thêm",
    providerName: "Tên bên cung cấp",
    providerUrl: "Link gọi API (Base URL)",
    providerKey: "API Key (Mã khóa)",
    addProviderBtn: "Thêm bên cung cấp",
    selectProviderLabel: "Chọn Bên Cung Cấp",
    modelNameLabel: "Tên Model",
    deleteProviderBtn: "Xóa",
    duplicateProviderAlert: "Tên bên này đã tồn tại!",
    fillAllFieldsAlert: "Vui lòng nhập đầy đủ tên, link gọi và API Key!",
    systemInstructionsTitle: "Chỉ thị Hệ thống (System Instructions)",
    defaultInstructionsLabel: "Chỉ thị mặc định từ server.ts (Luật chạy AI)",
    customInstructionsLabel: "Quy tắc bổ sung của bạn (Custom instructions)",
    resetInstructionsBtn: "Đặt lại về mặc định (Reset)",
    doneInstructionsBtn: "Hoàn thành & Lưu (Done)",
    saveInstructionsSuccess: "Đã lưu chỉ thị hệ thống thành công!"
  },
  en: {
    settings: "System Settings",
    projectName: "Project Name",
    darkMode: "Dark Mode Selection",
    darkModeOn: "Dark Mode Active",
    lightModeOn: "Light Mode Active",
    systemInstructions: "System Instructions",
    primaryKey: "Gemini API Key (Primary)",
    primaryPlaceholder: "Enter API Key to generate main code (falls back to env key if empty)...",
    secondaryKey: "Gemini API Key (Secondary)",
    secondaryPlaceholder: "Enter API Key for fast Neon/Clean/Light/Dark mockup generation...",
    modelSelection: "Available Model List",
    addModelBtn: "Add model",
    addModelPlaceholder: "Enter model name (e.g. gemini-2.0-pro-exp)...",
    safetyMode: "Interactive Safe Mode",
    safetyEnabledTip: "Active: Limit to max 3 projects, deleting requires writing matching project name exactly.",
    safetyDisabledTip: "Inactive: Limit is raised to 10. Automatically removes oldest if exceeding limit every 100s. Deleting only requires simple verification checkbox.",
    securityTitle: "Device Privacy Protection",
    securityDesc: "Keys, settings and custom layouts are strictly contained on your browser's localStorage. Zero trace on server, 100% security guaranteed.",
    deleteProject: "Permanently Delete Project",
    dangerZone: "Danger Zone",
    confirmDeleteTitle: "Delete Project Confirmation?",
    confirmDeleteDesc: "This is irreversible. To proceed, type the exact name \"{name}\" below.",
    confirmDeleteCheckboxDesc: "I agree and confirm I want to delete this project permanently.",
    cancel: "Cancel",
    delete: "Delete Now",
    maxProjectsAlert: "You have reached your project limit. Turn off Safe Mode in Settings to increase limit to 10, or delete an old one!",
    unusedCleanupMsg: "Auto-cleaned unused projects that were stale for over 30 days to free up space.",
    selectModel: "Choose main model to code...",
    languageSelection: "Language Selection",
    projectsCountLabel: "Projects Total:",
    providersTitle: "Custom API Providers Added",
    providerName: "Provider Name",
    providerUrl: "API Base URL",
    providerKey: "API Key",
    addProviderBtn: "Add Provider",
    selectProviderLabel: "Select API Provider",
    modelNameLabel: "Model Name",
    deleteProviderBtn: "Delete",
    duplicateProviderAlert: "Provider name already exists!",
    fillAllFieldsAlert: "Please fill in name, base URL and API Key!",
    systemInstructionsTitle: "System Instructions Management",
    defaultInstructionsLabel: "Default instructions from server.ts (AI rules)",
    customInstructionsLabel: "Your custom instructions",
    resetInstructionsBtn: "Reset to Default",
    doneInstructionsBtn: "Done & Save",
    saveInstructionsSuccess: "System instructions saved successfully!"
  }
};

const defaultFullFiles: Record<string, string> = {
  'index.html': `<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Game Mới</title>
</head>
<body>
    
</body>
</html>`,
  'metadata.json': `{}`,
  'readme.md': ``
};

export function getMergedHtml(files: Record<string, string>): string {
  let html = files['index.html'] || '<h1>No index.html found!</h1>';
  
  // Inline CSS files
  const linkRegex = /<link\s+[^>]*href=["']([^"']+)["'][^>]*>/gi;
  html = html.replace(linkRegex, (match, href) => {
    const cleanPath = href.replace(/^\.\//, '').replace(/^\//, '');
    const cssContent = files[cleanPath] || files[href];
    if (cssContent !== undefined) {
      return `<style data-file="${cleanPath}">\n${cssContent}\n</style>`;
    }
    return match;
  });
  
  // Inline JS files
  const scriptRegex = /<script\s+[^>]*src=["']([^"']+)["'][^>]*>\s*<\/script>/gi;
  html = html.replace(scriptRegex, (match, src) => {
    const cleanPath = src.replace(/^\.\//, '').replace(/^\//, '');
    const jsContent = files[cleanPath] || files[src];
    if (jsContent !== undefined) {
      return `<script data-file="${cleanPath}">\n${jsContent}\n</script>`;
    }
    return match;
  });

  return html;
}

export function parseModelCommands(text: string, currentFiles: Record<string, string>): Record<string, string> {
  const files = { ...currentFiles };
  const regex = /\[!(createnew|editfile|deletefile)(?:\s*file:|\s*:|:)\s*([^\s\]]+)\]/g;
  const matches: { command: string; path: string; index: number; length: number }[] = [];
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    matches.push({
      command: match[1],
      path: match[2],
      index: match.index,
      length: match[0].length
    });
  }
  
  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    const next = matches[i + 1];
    const startIndex = current.index + current.length;
    const endIndex = next ? next.index : text.length;
    
    let content = text.substring(startIndex, endIndex);
    content = cleanFileContent(content);
    
    if (current.command === 'createnew' || current.command === 'editfile') {
      files[current.path] = content;
    } else if (current.command === 'deletefile') {
      delete files[current.path];
    }
  }
  
  return files;
}

function cleanFileContent(content: string): string {
  let cleaned = content.trim();
  
  // Clean any wrapping markdown code block fences (including multiple nested/double-wrapped ones)
  while (true) {
    let changed = false;
    const startMatch = cleaned.match(/^\s*```[a-zA-Z0-9+#-]*[\r\n]*/i);
    if (startMatch) {
      cleaned = cleaned.substring(startMatch[0].length).trim();
      changed = true;
    }
    const endMatch = cleaned.match(/[\r\n]*```\s*$/);
    if (endMatch) {
      cleaned = cleaned.substring(0, cleaned.length - endMatch[0].length).trim();
      changed = true;
    }
    if (!changed) break;
  }
  
  return cleaned;
}

export const getGameNameFromMetadata = (files: Record<string, string>, defaultVal: string): string => {
  try {
    if (files && files['metadata.json']) {
      const meta = JSON.parse(files['metadata.json']);
      if (meta && meta.name) {
        return meta.name;
      }
    }
  } catch (e) {}
  return defaultVal;
};

interface FileImpact {
  type: 'create' | 'edit' | 'delete';
  path: string;
}

export function parseFileImpacts(text: string): FileImpact[] {
  const impacts: FileImpact[] = [];
  const regex = /\[!(createnew|editfile|deletefile)(?:\s*file:|\s*:|:)\s*([^\s\]]+)\]/g;
  let match;
  const seen = new Set<string>();
  while ((match = regex.exec(text)) !== null) {
    const cmd = match[1];
    const filePath = match[2];
    const key = `${cmd}:${filePath}`;
    if (!seen.has(key)) {
      seen.add(key);
      impacts.push({
        type: cmd === 'createnew' ? 'create' : (cmd === 'editfile' ? 'edit' : 'delete'),
        path: filePath
      });
    }
  }
  return impacts;
}

const FileImpactWidget = ({ text, theme, lang }: { text: string; theme: Theme; lang: 'vi' | 'en' }) => {
  const impacts = parseFileImpacts(text);
  if (impacts.length === 0) return null;

  return (
    <div className={`mt-3 p-3 rounded-xl border text-xs flex flex-col gap-2 ${
      theme === 'dark' ? 'bg-slate-800/80 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
    }`}>
      <div className="font-semibold text-[10px] uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
        <Sliders className="w-3 h-3 text-indigo-500 animate-pulse" />
        <span>{lang === 'vi' ? 'File bị tác động' : 'File Impacts'}</span>
      </div>
      <div className="flex flex-col gap-1.5">
        {impacts.map((imp, idx) => {
          const isDelete = imp.type === 'delete';
          return (
            <div 
              key={idx} 
              className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-[11px] font-mono transition-all ${
                theme === 'dark' 
                  ? 'bg-slate-900/40 border-slate-800' 
                  : 'bg-white border-slate-100'
              }`}
            >
              <div className="flex items-center gap-2 truncate pr-2">
                {imp.path.endsWith('.html') && <Code className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />}
                {imp.path.endsWith('.css') && <FileCode className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />}
                {imp.path.endsWith('.js') && <FileCode className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />}
                {imp.path.endsWith('.json') && <FileJson className="w-3.5 h-3.5 text-teal-400 flex-shrink-0" />}
                {imp.path.endsWith('.md') && <FileText className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />}
                {imp.path.endsWith('.py') && <FileCode className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />}
                {(imp.path.endsWith('.ts') || imp.path.endsWith('.tsx')) && <FileCode className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />}
                {!['.html', '.css', '.js', '.json', '.md', '.py', '.ts', '.tsx'].some(ext => imp.path.endsWith(ext)) && <File className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />}
                <span className={`truncate font-medium ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>{imp.path}</span>
              </div>
              <div className="flex items-center gap-1">
                {isDelete ? (
                  <span className="flex items-center gap-1 text-red-500 font-semibold text-[10px] bg-red-500/10 px-1.5 py-0.5 rounded">
                    <X className="w-3 h-3 stroke-[3]" /> {lang === 'vi' ? 'XÓA' : 'DELETE'}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-emerald-500 font-semibold text-[10px] bg-emerald-500/10 px-1.5 py-0.5 rounded">
                    <Check className="w-3 h-3 stroke-[3]" /> {imp.type === 'create' ? (lang === 'vi' ? 'TẠO MỚI' : 'CREATE') : (lang === 'vi' ? 'CẬP NHẬT' : 'UPDATE')}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const defaultProject: Project = {
  id: generateId(),
  name: 'New Game',
  messages: [
    { role: 'model', text: 'Welcome to AI Studio. Describe the HTML game you want to build!', codeSnapshot: '<!-- Game code will appear here -->' }
  ],
  code: '<!-- Game code will appear here -->',
  systemInstruction: getGlobalSystemInstruction(),
  themePrompt: getGlobalThemeInstruction(),
  additionalSystemInstruction: getGlobalAdditionalSystemInstruction(),
  customModel: getGlobalCustomModel(),
  lastUsedAt: Date.now(),
  mode: 'quick'
};

export default function App() {
  const [customDialog, setCustomDialog] = useState<{
    type: 'alert' | 'confirm' | 'prompt';
    message: string;
    defaultValue?: string;
    showFileUpload?: boolean;
    onConfirm: (val?: string) => void;
    onCancel?: () => void;
  } | null>(null);

  // File actions & multiselect state
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [multiSelectedPaths, setMultiSelectedPaths] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    nodePath: string;
    isFolder: boolean;
  } | null>(null);
  const [moveTargetPaths, setMoveTargetPaths] = useState<string[] | null>(null);
  const [targetFolderSelection, setTargetFolderSelection] = useState<string>('');
  const [newFolderNameInput, setNewFolderNameInput] = useState<string>('');

  useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    window.addEventListener('click', closeMenu);
    window.addEventListener('contextmenu', closeMenu);
    return () => {
      window.removeEventListener('click', closeMenu);
      window.removeEventListener('contextmenu', closeMenu);
    };
  }, []);

  const toggleSelectMode = () => {
    setIsSelectMode(!isSelectMode);
    setMultiSelectedPaths(new Set());
  };

  const handleSelectOption = (path: string) => {
    setIsSelectMode(true);
    setMultiSelectedPaths(new Set([path]));
  };

  // Theme
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem(THEME_KEY);
    return (saved as Theme) || 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  // Language setting
  const [lang, setLang] = useState<'vi' | 'en'>(() => {
    try {
      const saved = localStorage.getItem('ai_studio_lang');
      return (saved === 'en' || saved === 'vi') ? saved : 'vi';
    } catch (e) {
      return 'vi';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('ai_studio_lang', lang);
    } catch (e) {}
  }, [lang]);

  // Safe Mode setting
  const [safeMode, setSafeMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('ai_studio_safe_mode');
      return saved !== 'false'; // default is true
    } catch (e) {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('ai_studio_safe_mode', String(safeMode));
    } catch (e) {}
  }, [safeMode]);

  // Checkbox confirm delete state (when safeMode is false)
  const [confirmDeleteChecked, setConfirmDeleteChecked] = useState(false);

  // States for model/provider deletion confirmation in safeMode
  const [modelToDelete, setModelToDelete] = useState<ModelItem | null>(null);
  const [providerToDeleteId, setProviderToDeleteId] = useState<string | null>(null);
  const [confirmDeleteModelChecked, setConfirmDeleteModelChecked] = useState(false);
  const [confirmDeleteProviderChecked, setConfirmDeleteProviderChecked] = useState(false);

  // Custom UI dropdowns states
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [selectedProviderDropdownOpen, setSelectedProviderDropdownOpen] = useState(false);

  // AI parameters config state (Chính and Phụ tabs)
  const [showAiParams, setShowAiParams] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [activeParamsTab, setActiveParamsTab] = useState<'primary' | 'secondary'>('primary');

  // Terminal/Tmux console and python package manager states
  const [showTerminalModal, setShowTerminalModal] = useState(false);
  const [terminalInput, setTerminalInput] = useState('');
  const [terminalHistory, setTerminalHistory] = useState<{ text: string; type: 'input' | 'output' | 'error' | 'success' }[]>([
    { text: '==============================================', type: 'output' },
    { text: '     Welcome to TMUX terminal console v1.0.0  ', type: 'success' },
    { text: '==============================================', type: 'output' },
    { text: 'Type "help" to see available commands or click quick actions.', type: 'output' },
    { text: '', type: 'output' }
  ]);
  const [downloadedLibraries, setDownloadedLibraries] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('python_libraries');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });
  const [showLibraryManager, setShowLibraryManager] = useState(false);
  const [librarySearchQuery, setLibrarySearchQuery] = useState('');
  const [resetConfirmationState, setResetConfirmationState] = useState(false);

  const terminalFileInputRef = useRef<HTMLInputElement>(null);
  const terminalLogsEndRef = useRef<HTMLDivElement>(null);

  const getDownloadedLibrariesSize = () => {
    return downloadedLibraries.reduce((total, name) => {
      const lib = PYTHON_LIBRARIES_DB.find(l => l.name === name);
      return total + (lib ? lib.size : 0);
    }, 0);
  };

  const handleToggleLibraryDownload = (name: string) => {
    const isDownloaded = downloadedLibraries.includes(name);
    if (isDownloaded) {
      const updated = downloadedLibraries.filter(n => n !== name);
      setDownloadedLibraries(updated);
      try {
        localStorage.setItem('python_libraries', JSON.stringify(updated));
      } catch (e) {}
      setTerminalHistory(prev => [...prev, { text: `Successfully uninstalled python library: ${name}`, type: 'success' }]);
    } else {
      const lib = PYTHON_LIBRARIES_DB.find(l => l.name === name);
      if (!lib) return;
      const currentSize = getDownloadedLibrariesSize();
      if (currentSize + lib.size > 200) {
        setTerminalHistory(prev => [...prev, { text: `Error: Cannot download ${name} (${lib.size}MB). Exceeds 200MB limit.`, type: 'error' }]);
        return;
      }
      const updated = [...downloadedLibraries, name];
      setDownloadedLibraries(updated);
      try {
        localStorage.setItem('python_libraries', JSON.stringify(updated));
      } catch (e) {}
      setTerminalHistory(prev => [...prev, { text: `Successfully downloaded and installed python library: ${name} (${lib.size}MB)`, type: 'success' }]);
    }
  };

  const handleTerminalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const rawInput = terminalInput.trim();
    if (!rawInput) return;

    setTerminalHistory(prev => [...prev, { text: `guest@tmux:~$ ${rawInput}`, type: 'input' }]);
    setTerminalInput('');

    // VFS Tag Commands Parser
    const containsVFSTags = /\[!(createnew|editfile|deletefile|readfile)/i.test(rawInput);
    if (containsVFSTags) {
      // Find all matches for readfile
      const readfileRegex = /\[!readfile:([^\]]+)\]/gi;
      let readMatch;
      let hasRead = false;
      while ((readMatch = readfileRegex.exec(rawInput)) !== null) {
        hasRead = true;
        const filePath = readMatch[1].trim();
        const content = currentProject.mode === 'full' && currentProject.files
          ? currentProject.files[filePath]
          : (filePath === 'index.html' ? currentProject.code : undefined);

        if (content !== undefined) {
          setTerminalHistory(prev => [
            ...prev,
            { text: `--- FILE: ${filePath} ---`, type: 'output' },
            { text: content, type: 'output' },
            { text: `--- END OF FILE ---`, type: 'output' }
          ]);
        } else {
          setTerminalHistory(prev => [...prev, { text: `File not found in project: ${filePath}`, type: 'error' }]);
        }
      }

      // Check for write/delete commands
      const hasWriteOrDelete = /\[!(createnew|editfile|deletefile)/i.test(rawInput);
      if (hasWriteOrDelete) {
        let currentFiles = currentProject.files || {};
        if (currentProject.mode !== 'full') {
          // If in quick mode, seed index.html into files first
          currentFiles = { "index.html": currentProject.code };
        }

        const updatedFiles = parseModelCommands(rawInput, currentFiles);
        const mergedCode = getMergedHtml(updatedFiles);

        // Find which files were changed/created/deleted to output log
        const oldPaths = Object.keys(currentFiles);
        const newPaths = Object.keys(updatedFiles);
        const created = newPaths.filter(p => !oldPaths.includes(p));
        const updated = newPaths.filter(p => oldPaths.includes(p) && updatedFiles[p] !== currentFiles[p]);
        const deleted = oldPaths.filter(p => !newPaths.includes(p));

        const logs: string[] = [];
        if (created.length > 0) logs.push(`Created: ${created.join(', ')}`);
        if (updated.length > 0) logs.push(`Updated: ${updated.join(', ')}`);
        if (deleted.length > 0) logs.push(`Deleted: ${deleted.join(', ')}`);

        updateProject({
          files: updatedFiles,
          code: mergedCode,
          mode: 'full' // Automatically switch to full mode since they are managing multiple files!
        });

        setTerminalHistory(prev => [
          ...prev,
          { text: `Successfully processed VFS tags. Switched project to Full mode.`, type: 'success' },
          ...logs.map(log => ({ text: log, type: 'success' as const }))
        ]);
      }
      return;
    }

    const args = rawInput.split(/\s+/);
    const command = args[0].toLowerCase();

    if (resetConfirmationState && command !== 'reset_all_data') {
      setResetConfirmationState(false);
    }

    if (command === 'help') {
      setTerminalHistory(prev => [
        ...prev,
        { text: 'Available commands:', type: 'output' },
        { text: '  open_library_python  - Open Python Library Manager', type: 'output' },
        { text: '  pip install <name>   - Quickly download and install a Python library', type: 'output' },
        { text: '  help                 - Display this help message', type: 'output' },
        { text: '  clear                - Clear terminal logs screen', type: 'output' },
        { text: '  exit                 - Close terminal console', type: 'output' },
        { text: '  reset_all_data       - Wipe out all saved data completely', type: 'output' },
        { text: '  import_data          - Import local backup data from machine', type: 'output' },
        { text: '  export_data          - Export data and custom presets to data.msh', type: 'output' }
      ]);
    } else if (command === 'clear') {
      setTerminalHistory([]);
    } else if (command === 'exit') {
      setShowTerminalModal(false);
    } else if (command === 'open_library_python') {
      setShowLibraryManager(true);
      setTerminalHistory(prev => [...prev, { text: 'Opening Python Library Manager...', type: 'success' }]);
    } else if (command === 'reset_all_data') {
      if (resetConfirmationState) {
        try {
          localStorage.removeItem('ai_studio_projects');
          localStorage.removeItem('custom_providers');
          localStorage.removeItem('custom_models_list_v2');
          localStorage.removeItem('custom_models_list');
          localStorage.removeItem('secondary_model');
          localStorage.removeItem('ai_params_config');
          localStorage.removeItem('python_libraries');
          localStorage.removeItem('global_sys_rules');
          localStorage.removeItem('global_custom_model');
          localStorage.removeItem('global_system_instruction');
          localStorage.removeItem('global_theme_instruction');
          localStorage.removeItem('global_additional_system_instruction');
          
          for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            if (key && key.startsWith('sys_rules_by_project_')) {
              localStorage.removeItem(key);
            }
          }

          const freshId = generateId();
          const freshProject = {
            ...defaultProject,
            id: freshId,
            systemInstruction: getGlobalSystemInstruction(),
            themePrompt: getGlobalThemeInstruction(),
            additionalSystemInstruction: getGlobalAdditionalSystemInstruction(),
            customModel: getGlobalCustomModel(),
            lastUsedAt: Date.now()
          };
          setProjects([freshProject]);
          setCurrentId(freshId);

          setProviders([
            { id: 'gemini', name: 'Gemini (Default)', baseUrl: 'https://generativelanguage.googleapis.com', apiKey: '' }
          ]);

          setCustomModelsList([
            { name: 'gemini-2.5-pro', providerId: 'gemini' },
            { name: 'gemini-3.5-flash', providerId: 'gemini' },
            { name: 'gemini-2.5-flash', providerId: 'gemini' },
            { name: 'gemini-3.1-flash-lite', providerId: 'gemini' },
            { name: 'gemini-3-flash-preview', providerId: 'gemini' },
            { name: 'gemini-2.5-flash-lite', providerId: 'gemini' }
          ]);

          setSecondaryModel(null);
          setDownloadedLibraries([]);
          setAiParams({
            primary: {
              maxCompletionTokens: 8192,
              temperature: 1.0,
              topP: 1.0,
              reasoningEffort: 'medium',
              stream: true,
              stop: null,
              CanThink: false
            },
            secondary: {
              maxCompletionTokens: 8192,
              temperature: 1.0,
              topP: 1.0,
              reasoningEffort: 'medium',
              stream: true,
              stop: null
            }
          });

          setResetConfirmationState(false);
          setTerminalHistory(prev => [...prev, { text: 'ALL SAVED DATA HAS BEEN WIPED OUT SUCCESSFULLY! REBOOT COMPLETE.', type: 'success' }]);
        } catch (e) {
          setTerminalHistory(prev => [...prev, { text: `Error during reset: ${e}`, type: 'error' }]);
        }
      } else {
        setResetConfirmationState(true);
        setTerminalHistory(prev => [
          ...prev,
          { text: 'WARNING: This action will permanently delete all projects, keys, custom models, system instructions and libraries.', type: 'error' },
          { text: "Are you sure? Type or click 'reset_all_data' again to confirm and wipe.", type: 'error' }
        ]);
      }
    } else if (command === 'import_data') {
      if (terminalFileInputRef.current) {
        terminalFileInputRef.current.click();
        setTerminalHistory(prev => [...prev, { text: 'Opening file picker...', type: 'output' }]);
      }
    } else if (command === 'export_data') {
      try {
        const payload = {
          projects,
          providers,
          customModelsList,
          secondaryModel,
          aiParams,
          downloadedLibraries,
          timestamp: Date.now()
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'data.msh';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setTerminalHistory(prev => [...prev, { text: 'Exported backup to "data.msh" successfully!', type: 'success' }]);
      } catch (e) {
        setTerminalHistory(prev => [...prev, { text: `Export failed: ${e}`, type: 'error' }]);
      }
    } else if (command === 'pip') {
      const subCommand = args[1]?.toLowerCase();
      if (subCommand === 'install') {
        const libName = args[2];
        if (!libName) {
          setTerminalHistory(prev => [...prev, { text: 'ERROR: You must specify at least one package to install.', type: 'error' }]);
          setTerminalHistory(prev => [...prev, { text: 'Usage: pip install <package_name>', type: 'error' }]);
        } else {
          const lib = PYTHON_LIBRARIES_DB.find(l => l.name.toLowerCase() === libName.toLowerCase());
          if (lib) {
            const isDownloaded = downloadedLibraries.includes(lib.name);
            if (isDownloaded) {
              setTerminalHistory(prev => [...prev, { text: `Requirement already satisfied: ${lib.name} in virtual environment.`, type: 'success' }]);
            } else {
              const currentSize = getDownloadedLibrariesSize();
              if (currentSize + lib.size > 200) {
                setTerminalHistory(prev => [...prev, { text: `ERROR: Cannot download ${lib.name} (${lib.size}MB). Exceeds 200MB system space limit.`, type: 'error' }]);
              } else {
                const updated = [...downloadedLibraries, lib.name];
                setDownloadedLibraries(updated);
                try {
                  localStorage.setItem('python_libraries', JSON.stringify(updated));
                } catch (e) {}
                setTerminalHistory(prev => [
                  ...prev,
                  { text: `Collecting ${lib.name}...`, type: 'output' },
                  { text: `  Downloading ${lib.name}-${lib.size}MB-py3-none-any.whl`, type: 'output' },
                  { text: `Installing collected packages: ${lib.name}`, type: 'output' },
                  { text: `Successfully installed ${lib.name}`, type: 'success' }
                ]);
              }
            }
          } else {
            setTerminalHistory(prev => [
              ...prev,
              { text: `ERROR: Could not find a version that satisfies the requirement ${libName} (from versions: none)`, type: 'error' },
              { text: `ERROR: No matching distribution found for ${libName}`, type: 'error' }
            ]);
          }
        }
      } else {
        setTerminalHistory(prev => [...prev, { text: 'Usage: pip install <library_name>', type: 'error' }]);
      }
    } else {
      setTerminalHistory(prev => [...prev, { text: `tmux: command not found: ${command}. Type 'help' for info.`, type: 'error' }]);
    }
  };

  const handleTerminalImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const data = JSON.parse(text);

        if (!data || (!data.projects && !data.providers)) {
          setTerminalHistory(prev => [...prev, { text: 'Import failed: Invalid data.msh file format.', type: 'error' }]);
          return;
        }

        if (data.projects && Array.isArray(data.projects)) {
          setProjects(data.projects);
          if (data.projects.length > 0) {
            setCurrentId(data.projects[0].id);
          }
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data.projects));
        }

        if (data.providers && Array.isArray(data.providers)) {
          setProviders(data.providers);
          localStorage.setItem('custom_providers', JSON.stringify(data.providers));
        }

        if (data.customModelsList && Array.isArray(data.customModelsList)) {
          setCustomModelsList(data.customModelsList);
          localStorage.setItem('custom_models_list_v2', JSON.stringify(data.customModelsList));
        }

        if (data.secondaryModel !== undefined) {
          setSecondaryModel(data.secondaryModel);
          if (data.secondaryModel) {
            localStorage.setItem('secondary_model', JSON.stringify(data.secondaryModel));
          } else {
            localStorage.removeItem('secondary_model');
          }
        }

        if (data.aiParams) {
          setAiParams(data.aiParams);
          localStorage.setItem('ai_params_config', JSON.stringify(data.aiParams));
        }

        if (data.downloadedLibraries && Array.isArray(data.downloadedLibraries)) {
          setDownloadedLibraries(data.downloadedLibraries);
          localStorage.setItem('python_libraries', JSON.stringify(data.downloadedLibraries));
        }

        setTerminalHistory(prev => [...prev, { text: 'IMPORT COMPLETED SUCCESSFULLY! All data restored.', type: 'success' }]);
      } catch (err) {
        setTerminalHistory(prev => [...prev, { text: `Import error: ${err}`, type: 'error' }]);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  useEffect(() => {
    if (terminalLogsEndRef.current) {
      terminalLogsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [terminalHistory]);
  const [aiParams, setAiParams] = useState(() => {
    try {
      const saved = localStorage.getItem('ai_params_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.primary && parsed.primary.CanThink === undefined) {
          parsed.primary.CanThink = parsed.primary.enableThinking || false;
        }
        return parsed;
      }
    } catch (e) {}
    return {
      primary: {
        maxCompletionTokens: 8192,
        temperature: 1.0,
        topP: 1.0,
        reasoningEffort: 'medium',
        stream: true,
        stop: null,
        CanThink: false
      },
      secondary: {
        maxCompletionTokens: 8192,
        temperature: 1.0,
        topP: 1.0,
        reasoningEffort: 'medium',
        stream: true,
        stop: null
      }
    };
  });

  useEffect(() => {
    try {
      localStorage.setItem('ai_params_config', JSON.stringify(aiParams));
    } catch (e) {}
  }, [aiParams]);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Custom API providers state
  const [providers, setProviders] = useState<Provider[]>(() => {
    try {
      const saved = localStorage.getItem('custom_providers');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {}
    return [
      { id: 'gemini', name: 'Gemini (Default)', baseUrl: 'https://generativelanguage.googleapis.com', apiKey: '' }
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem('custom_providers', JSON.stringify(providers));
    } catch (e) {}
  }, [providers]);

  // Provider Inputs State
  const [newProviderName, setNewProviderName] = useState('');
  const [newProviderUrl, setNewProviderUrl] = useState('');
  const [newProviderKey, setNewProviderKey] = useState('');

  const handleAddNewProvider = () => {
    const pName = newProviderName.trim();
    const pUrl = newProviderUrl.trim();
    const pKey = newProviderKey.trim();

    if (!pName || !pUrl || !pKey) {
      setCustomDialog({ type: 'alert', message: lang === 'vi' ? translations.vi.fillAllFieldsAlert : translations.en.fillAllFieldsAlert, onConfirm: () => {} });
      return;
    }

    if (providers.length >= 100) {
      setCustomDialog({
        type: 'alert',
        message: lang === 'vi' ? 'Bạn đã đạt giới hạn tối đa 100 bên cung cấp!' : 'You have reached the limit of 100 providers!',
        onConfirm: () => {}
      });
      return;
    }

    if (providers.some(p => p.name.toLowerCase() === pName.toLowerCase() || p.id === pName.toLowerCase().replace(/\s+/g, '-'))) {
      setCustomDialog({ type: 'alert', message: lang === 'vi' ? translations.vi.duplicateProviderAlert : translations.en.duplicateProviderAlert, onConfirm: () => {} });
      return;
    }

    const newProv: Provider = {
      id: pName.toLowerCase().replace(/\s+/g, '-'),
      name: pName,
      baseUrl: pUrl,
      apiKey: pKey
    };

    setProviders(prev => [...prev, newProv]);
    setNewProviderName('');
    setNewProviderUrl('');
    setNewProviderKey('');
  };

  const confirmDeleteProviderActual = (idToDelete: string) => {
    setProviders(prev => prev.filter(p => p.id !== idToDelete));
    setCustomModelsList(prev => {
      const remaining = prev.filter(m => m.providerId !== idToDelete);
      const isCurrentDeleted = prev.some(m => m.providerId === idToDelete && m.name === currentProject.customModel);
      if (isCurrentDeleted) {
        updateProject({ customModel: '' });
        try {
          localStorage.setItem('global_custom_model', '');
        } catch (e) {}
      }
      return remaining;
    });
    if (secondaryModel && secondaryModel.providerId === idToDelete) {
      setSecondaryModel(null);
    }
  };

  const handleDeleteProvider = (idToDelete: string) => {
    if (idToDelete === 'gemini') return; // Cannot delete default Gemini provider
    if (safeMode) {
      setProviderToDeleteId(idToDelete);
      setConfirmDeleteProviderChecked(false);
    } else {
      setCustomDialog({
        type: 'confirm',
        message: lang === 'vi' ? 'Bạn có chắc chắn muốn xóa provider này không?' : 'Are you sure you want to delete this provider?',
        onConfirm: () => confirmDeleteProviderActual(idToDelete)
      });
    }
  };

  const confirmDeleteModelActual = (mod: ModelItem) => {
    setCustomModelsList(prev => prev.filter(m => !(m.name === mod.name && m.providerId === mod.providerId)));
    const modelKey = `${mod.providerId}:${mod.name}`;
    if (currentProject.customModel === mod.name || currentProject.customModel === modelKey) {
      updateProject({ customModel: '' });
      try {
        localStorage.setItem('global_custom_model', '');
      } catch (e) {}
    }
    if (secondaryModel?.name === mod.name && secondaryModel?.providerId === mod.providerId) {
      setSecondaryModel(null);
    }
  };

  const handleDeleteModel = (mod: ModelItem) => {
    if (safeMode) {
      setModelToDelete(mod);
      setConfirmDeleteModelChecked(false);
    } else {
      setCustomDialog({
        type: 'confirm',
        message: lang === 'vi' ? `Bạn có chắc chắn muốn xóa model: ${mod.name}?` : `Are you sure you want to delete model: ${mod.name}?`,
        onConfirm: () => confirmDeleteModelActual(mod)
      });
    }
  };

  // Custom models list state
  const [customModelsList, setCustomModelsList] = useState<ModelItem[]>(() => {
    try {
      const saved = localStorage.getItem('custom_models_list_v2');
      if (saved) {
        return JSON.parse(saved);
      }
      const oldSaved = localStorage.getItem('custom_models_list');
      if (oldSaved) {
        const oldParsed = JSON.parse(oldSaved);
        if (Array.isArray(oldParsed)) {
          return oldParsed.map((item: any) => {
            if (typeof item === 'string') {
              return { name: item, providerId: 'gemini' };
            }
            return item;
          });
        }
      }
    } catch (e) {}
    return [
      { name: 'gemini-2.5-pro', providerId: 'gemini' },
      { name: 'gemini-3.5-flash', providerId: 'gemini' },
      { name: 'gemini-2.5-flash', providerId: 'gemini' },
      { name: 'gemini-3.1-flash-lite', providerId: 'gemini' },
      { name: 'gemini-3-flash-preview', providerId: 'gemini' },
      { name: 'gemini-2.5-flash-lite', providerId: 'gemini' }
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem('custom_models_list_v2', JSON.stringify(customModelsList));
    } catch (e) {}
  }, [customModelsList]);

  const [secondaryModel, setSecondaryModel] = useState<ModelItem | null>(() => {
    try {
      const saved = localStorage.getItem('secondary_model');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {}
    return null;
  });

  useEffect(() => {
    try {
      if (secondaryModel) {
        localStorage.setItem('secondary_model', JSON.stringify(secondaryModel));
      } else {
        localStorage.removeItem('secondary_model');
      }
    } catch (e) {}
  }, [secondaryModel]);

  const [selectedProviderIdForNewModel, setSelectedProviderIdForNewModel] = useState('gemini');
  const [newModelInput, setNewModelInput] = useState('');
  const [newModelTaskType, setNewModelTaskType] = useState('Text Generation');
  const [taskTypeDropdownOpen, setTaskTypeDropdownOpen] = useState(false);
  const [modelError, setModelError] = useState('');

  useEffect(() => {
    setModelError('');
  }, [newModelInput, selectedProviderIdForNewModel]);

  const handleAddNewModel = () => {
    const trimmed = newModelInput.trim();
    if (!trimmed) return;

    if (customModelsList.length >= 1000) {
      setCustomDialog({
        type: 'alert',
        message: lang === 'vi' ? 'Bạn đã đạt giới hạn tối đa 1000 model!' : 'You have reached the limit of 1000 models!',
        onConfirm: () => {}
      });
      return;
    }
    
    const isDuplicate = customModelsList.some(
      m => m.name.toLowerCase() === trimmed.toLowerCase() && m.providerId === selectedProviderIdForNewModel
    );

    if (isDuplicate) {
      setModelError(lang === 'vi' ? 'Model này đã tồn tại ở bên cung cấp này!' : 'This model already exists for this provider!');
      return;
    }

    setModelError('');
    const updated = [...customModelsList, { name: trimmed, providerId: selectedProviderIdForNewModel, taskType: newModelTaskType }];
    setCustomModelsList(updated);
    const modelKey = `${selectedProviderIdForNewModel}:${trimmed}`;
    updateProject({ customModel: modelKey });
    try {
      localStorage.setItem('global_custom_model', modelKey);
    } catch (err) {}
    setNewModelInput('');
  };

  // Projects
  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map((p: any) => {
          let updatedInstruction = p.systemInstruction;
          if (updatedInstruction && !updatedInstruction.includes('findlibrary')) {
            const primaryRules = DEFAULT_RULES
              .filter(r => r.type === 'primary')
              .map(r => r.content.trim())
              .filter(Boolean)
              .join('\n\n');
            updatedInstruction = primaryRules;
          }
          return {
            ...p,
            systemInstruction: updatedInstruction,
            lastUsedAt: p.lastUsedAt || Date.now()
          };
        });
      } catch (e) {}
    }
    return [{ ...defaultProject, lastUsedAt: Date.now() }];
  });

  const [currentId, setCurrentId] = useState<string>(projects[0]?.id || defaultProject.id);

  const currentProject = projects.find(p => p.id === currentId) || defaultProject;

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSysInstructions, setShowSysInstructions] = useState(false);
  const [sysInstructionInput, setSysInstructionInput] = useState('');
  const [sysRules, setSysRules] = useState<InstructionRule[]>([]);
  const [newProjName, setNewProjName] = useState('');
  const [newProjMode, setNewProjMode] = useState<'quick' | 'full'>('quick');
  const [selectedFilePath, setSelectedFilePath] = useState<string>('index.html');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() => new Set(['css', 'js']));
  const [touchDragSource, setTouchDragSource] = useState<string | null>(null);
  const [touchDragOver, setTouchDragOver] = useState<string | null>(null);

  const [annotation, setAnnotation] = useState<{
    start: number;
    end: number;
    selectedText: string;
    filePath: string;
  } | null>(null);
  const [annotationInput, setAnnotationInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleOpenAnnotation = () => {
    const el = textareaRef.current;
    if (!el) return;

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const text = el.value;
    const selectedText = text.substring(start, end);

    if (!selectedText || selectedText.trim() === '') {
      setCustomDialog({
        type: 'alert',
        message: lang === 'vi' 
          ? 'Vui lòng bôi đen (quét chọn) một đoạn code bất kỳ trong file trước khi bấm Cây Bút để sửa nhanh!' 
          : 'Please select (highlight) a block of code in the file before clicking the Pen Tool to edit!',
        onConfirm: () => {}
      });
      return;
    }

    setAnnotation({
      start,
      end,
      selectedText,
      filePath: currentProject.mode === 'full' ? selectedFilePath : 'index.html'
    });
    setAnnotationInput('');
  };

  const handleSendAnnotation = () => {
    if (!annotation || !annotationInput.trim()) return;

    const targetFile = annotation.filePath;
    const promptText = `Yêu cầu sửa nhanh đoạn code được khoanh vùng trong file "${targetFile}":

--- ĐOẠN CODE ĐƯỢC CHỌN ---
${annotation.selectedText}
--- HẾT ĐOẠN CODE ĐƯỢC CHỌN ---

Yêu cầu sửa đổi cụ thể:
${annotationInput}

Hãy CHỈ SỬA ĐOẠN CODE TRÊN và thay thế nó vào vị trí cũ trong file, giữ nguyên hoàn toàn các phần khác của file. Cảm ơn!`;

    handleSend(promptText);
    
    setAnnotation(null);
    setAnnotationInput('');
  };

  useEffect(() => {
    if (currentProject.mode === 'full' && currentProject.files) {
      if (!currentProject.files[selectedFilePath]) {
        const paths = Object.keys(currentProject.files);
        if (paths.includes('index.html')) {
          setSelectedFilePath('index.html');
        } else if (paths.length > 0) {
          setSelectedFilePath(paths[0]);
        }
      }
    }
  }, [currentId, currentProject.mode]);

  const updateProject = (updates: Partial<Project>) => {
    setProjects(prev => prev.map(p => p.id === currentId ? { ...p, ...updates, lastUsedAt: Date.now() } : p));
  };

  const handleCodeChange = (newVal: string) => {
    if (currentProject.mode === 'full') {
      const updatedFiles = { ...(currentProject.files || {}), [selectedFilePath]: newVal };
      
      // Update name if editing metadata.json
      let projName = currentProject.name;
      if (selectedFilePath === 'metadata.json') {
        projName = getGameNameFromMetadata(updatedFiles, currentProject.name);
      }
      
      updateProject({
        files: updatedFiles,
        code: getMergedHtml(updatedFiles),
        name: projName
      });
    } else {
      updateProject({ code: newVal });
    }
  };

  const handleAddFilePrompt = () => {
    // Clear any previous cached uploads
    delete (window as any)._dialogUploadedContent;
    delete (window as any)._dialogUploadedName;

    setCustomDialog({
      type: 'prompt',
      showFileUpload: true,
      message: lang === 'vi' ? 'Nhập đường dẫn file mới (ví dụ: style.css hoặc js/game.js):' : 'Enter new file path (e.g., style.css or js/game.js):',
      onConfirm: (path) => {
        const inputName = path?.trim() || (window as any)._dialogUploadedName || '';
        const cleanPath = inputName.trim().replace(/^\.\//, '').replace(/^\//, '');
        if (!cleanPath) return;
        
        const files = currentProject.files || {};
        if (files[cleanPath] !== undefined) {
          setCustomDialog({
            type: 'alert',
            message: lang === 'vi' ? 'File này đã tồn tại!' : 'File already exists!',
            onConfirm: () => {}
          });
          return;
        }
        
        // Use uploaded file content if available and matching the name, otherwise empty string
        const fileContent = (window as any)._dialogUploadedContent !== undefined && (window as any)._dialogUploadedName === inputName
          ? (window as any)._dialogUploadedContent
          : '';
        
        const updatedFiles = { ...files, [cleanPath]: fileContent };
        updateProject({
          files: updatedFiles,
          code: getMergedHtml(updatedFiles)
        });
        setSelectedFilePath(cleanPath);

        // Clean up
        delete (window as any)._dialogUploadedContent;
        delete (window as any)._dialogUploadedName;
      }
    });
  };

  interface TreeNode {
    name: string;
    path: string;
    isFolder: boolean;
    children: TreeNode[];
  }

  const buildTree = (files: Record<string, string>): TreeNode => {
    const root: TreeNode = { name: 'Root', path: '', isFolder: true, children: [] };
    const folderPaths = new Set<string>();
    const allPaths = Object.keys(files);

    allPaths.forEach(p => {
      const parts = p.split('/');
      let currentPath = '';
      for (let i = 0; i < parts.length - 1; i++) {
        currentPath = currentPath ? `${currentPath}/${parts[i]}` : parts[i];
        folderPaths.add(currentPath);
      }
      // If a path has no extension and is not index.html, it is treated as a folder!
      if (!p.includes('.') && p !== 'index.html') {
        folderPaths.add(p);
      }
    });

    const insertNode = (parent: TreeNode, parts: string[], currentDepth: number, fullPath: string, isFolder: boolean) => {
      if (currentDepth === parts.length) return;
      
      const name = parts[currentDepth];
      const nodePath = parts.slice(0, currentDepth + 1).join('/');
      
      let existing = parent.children.find(c => c.name === name);
      if (!existing) {
        existing = {
          name,
          path: nodePath,
          isFolder: isFolder || (currentDepth < parts.length - 1),
          children: []
        };
        parent.children.push(existing);
      }
      
      if (currentDepth < parts.length - 1) {
        insertNode(existing, parts, currentDepth + 1, fullPath, isFolder);
      }
    };

    Array.from(folderPaths).sort((a, b) => a.split('/').length - b.split('/').length).forEach(fPath => {
      const parts = fPath.split('/');
      insertNode(root, parts, 0, fPath, true);
    });

    allPaths.forEach(p => {
      if (folderPaths.has(p)) return;
      const parts = p.split('/');
      insertNode(root, parts, 0, p, false);
    });

    const sortTree = (node: TreeNode) => {
      node.children.sort((a, b) => {
        if (a.isFolder && !b.isFolder) return -1;
        if (!a.isFolder && b.isFolder) return 1;
        return a.name.localeCompare(b.name);
      });
      node.children.forEach(sortTree);
    };

    sortTree(root);
    return root;
  };

  const toggleFolder = (folderPath: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderPath)) {
        next.delete(folderPath);
      } else {
        next.add(folderPath);
      }
      return next;
    });
  };

  const moveFileOrFolder = (sourcePath: string, targetFolderPath: string) => {
    const files = currentProject.files || {};
    const updatedFiles = { ...files };

    const isFolder = !sourcePath.includes('.') || Object.keys(files).some(p => p.startsWith(sourcePath + '/'));

    if (isFolder) {
      const folderName = sourcePath.split('/').pop() || sourcePath;
      const newFolderPrefix = targetFolderPath ? `${targetFolderPath}/${folderName}` : folderName;

      if (newFolderPrefix === sourcePath || newFolderPrefix.startsWith(sourcePath + '/')) {
        return;
      }

      Object.keys(files).forEach(p => {
        if (p === sourcePath) {
          const content = files[p];
          delete updatedFiles[p];
          updatedFiles[newFolderPrefix] = content;
        } else if (p.startsWith(sourcePath + '/')) {
          const remainingPath = p.substring(sourcePath.length + 1);
          const newPath = `${newFolderPrefix}/${remainingPath}`;
          const content = files[p];
          delete updatedFiles[p];
          updatedFiles[newPath] = content;
        }
      });
    } else {
      const fileName = sourcePath.split('/').pop() || sourcePath;
      const newPath = targetFolderPath ? `${targetFolderPath}/${fileName}` : fileName;

      if (newPath === sourcePath) return;

      if (files[newPath] !== undefined) {
        setCustomDialog({
          type: 'alert',
          message: lang === 'vi' ? `File ${newPath} đã tồn tại!` : `File ${newPath} already exists!`,
          onConfirm: () => {}
        });
        return;
      }

      updatedFiles[newPath] = files[sourcePath];
      delete updatedFiles[sourcePath];

      if (selectedFilePath === sourcePath) {
        setSelectedFilePath(newPath);
      }
    }

    updateProject({
      files: updatedFiles,
      code: getMergedHtml(updatedFiles)
    });
  };

  const renameFileOrFolder = (oldPath: string, isFolder: boolean) => {
    const currentName = oldPath.split('/').pop() || oldPath;
    setCustomDialog({
      type: 'prompt',
      message: lang === 'vi' 
        ? `Đổi tên ${isFolder ? 'thư mục' : 'file'} "${currentName}" thành:` 
        : `Rename ${isFolder ? 'folder' : 'file'} "${currentName}" to:`,
      defaultValue: currentName,
      onConfirm: (newName) => {
        if (!newName || !newName.trim()) return;
        const cleanNewName = newName.trim();
        
        const parts = oldPath.split('/');
        parts[parts.length - 1] = cleanNewName;
        const newPath = parts.join('/');

        if (newPath === oldPath) return;

        const files = currentProject.files || {};
        const updatedFiles = { ...files };

        if (isFolder) {
          const folderPrefix = oldPath + '/';
          const newFolderPrefix = newPath + '/';

          // Check if any file would conflict
          let conflict = false;
          Object.keys(files).forEach(p => {
            if (p.startsWith(folderPrefix)) {
              const remaining = p.substring(folderPrefix.length);
              const targetPath = newFolderPrefix + remaining;
              if (files[targetPath] !== undefined) conflict = true;
            }
          });

          if (conflict) {
            setCustomDialog({
              type: 'alert',
              message: lang === 'vi' 
                ? 'Tên mới gây xung đột với các file đã có!' 
                : 'New name causes conflicts with existing files!',
              onConfirm: () => {}
            });
            return;
          }

          // Move all
          Object.keys(files).forEach(p => {
            if (p === oldPath) {
              updatedFiles[newPath] = files[p];
              delete updatedFiles[p];
            } else if (p.startsWith(folderPrefix)) {
              const remaining = p.substring(folderPrefix.length);
              updatedFiles[newFolderPrefix + remaining] = files[p];
              delete updatedFiles[p];
            }
          });
        } else {
          if (files[newPath] !== undefined) {
            setCustomDialog({
              type: 'alert',
              message: lang === 'vi' ? 'Tên file mới đã tồn tại!' : 'New file name already exists!',
              onConfirm: () => {}
            });
            return;
          }

          updatedFiles[newPath] = files[oldPath];
          delete updatedFiles[oldPath];

          if (selectedFilePath === oldPath) {
            setSelectedFilePath(newPath);
          }
        }

        updateProject({
          files: updatedFiles,
          code: getMergedHtml(updatedFiles)
        });
      }
    });
  };

  const extractFolder = (folderPath: string) => {
    const files = currentProject.files || {};
    const updatedFiles = { ...files };
    
    // Find parent path
    const parts = folderPath.split('/');
    parts.pop(); // remove current folder name
    const parentPath = parts.join('/'); // "" or parent path

    const folderPrefix = folderPath + '/';
    const filesToMove: { oldPath: string; newPath: string }[] = [];

    Object.keys(files).forEach(p => {
      if (p.startsWith(folderPrefix)) {
        const remainingPath = p.substring(folderPrefix.length);
        const newPath = parentPath ? `${parentPath}/${remainingPath}` : remainingPath;
        filesToMove.push({ oldPath: p, newPath });
      }
    });

    if (filesToMove.length === 0) {
      setCustomDialog({
        type: 'alert',
        message: lang === 'vi' ? 'Không có file nào để giải nén!' : 'No files to extract!',
        onConfirm: () => {}
      });
      return;
    }

    // Check if any destination file already exists
    for (const item of filesToMove) {
      if (files[item.newPath] !== undefined && item.newPath !== item.oldPath) {
        setCustomDialog({
          type: 'alert',
          message: lang === 'vi' 
            ? `Xung đột: file ${item.newPath} đã tồn tại ở ngoài!` 
            : `Conflict: file ${item.newPath} already exists outside!`,
          onConfirm: () => {}
        });
        return;
      }
    }

    // Perform the move
    filesToMove.forEach(item => {
      updatedFiles[item.newPath] = files[item.oldPath];
      delete updatedFiles[item.oldPath];
    });

    if (updatedFiles[folderPath] !== undefined) {
      delete updatedFiles[folderPath];
    }

    updateProject({
      files: updatedFiles,
      code: getMergedHtml(updatedFiles)
    });

    setCustomDialog({
      type: 'alert',
      message: lang === 'vi' 
        ? `Đã giải nén ${filesToMove.length} file ra thư mục ${parentPath || 'gốc'}.` 
        : `Extracted ${filesToMove.length} files to ${parentPath || 'root'} folder.`,
      onConfirm: () => {}
    });
  };

  const downloadFile = (filePath: string, content: string) => {
    let blob: Blob;
    if (content.startsWith('data:')) {
      const parts = content.split(',');
      const mime = parts[0].match(/:(.*?);/)?.[1] || '';
      const bstr = atob(parts[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      blob = new Blob([u8arr], { type: mime });
    } else {
      blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filePath.split('/').pop() || filePath;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadPathsAsZip = async (paths: string[], zipName: string) => {
    const zip = new JSZip();
    const files = currentProject.files || {};
    let addedAny = false;
    
    paths.forEach(p => {
      if (files[p] !== undefined) {
        const content = files[p];
        if (content.startsWith('data:')) {
          const base64Data = content.split(',')[1];
          zip.file(p, base64Data, { base64: true });
        } else {
          zip.file(p, content);
        }
        addedAny = true;
      } else {
        const prefix = p + '/';
        Object.keys(files).forEach(filePath => {
          if (filePath === p || filePath.startsWith(prefix)) {
            const content = files[filePath];
            if (content.startsWith('data:')) {
              const base64Data = content.split(',')[1];
              zip.file(filePath, base64Data, { base64: true });
            } else {
              zip.file(filePath, content);
            }
            addedAny = true;
          }
        });
      }
    });

    if (!addedAny) {
      setCustomDialog({
        type: 'alert',
        message: lang === 'vi' ? 'Không có nội dung file nào để tải!' : 'No file content to download!',
        onConfirm: () => {}
      });
      return;
    }

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = zipName.endsWith('.zip') ? zipName : `${zipName}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getExistingFolders = () => {
    const files = currentProject.files || {};
    const foldersSet = new Set<string>();
    Object.keys(files).forEach(p => {
      const parts = p.split('/');
      for (let i = 1; i < parts.length; i++) {
        foldersSet.add(parts.slice(0, i).join('/'));
      }
      if (!p.includes('.') && p !== 'index.html') {
        foldersSet.add(p);
      }
    });
    return Array.from(foldersSet).sort();
  };

  const moveMultiplePaths = (sourcePaths: string[], targetFolder: string) => {
    const files = currentProject.files || {};
    const updatedFiles = { ...files };
    
    const cleanTargetFolder = targetFolder.trim().replace(/^\.\//, '').replace(/^\//, '').replace(/\/$/, '');

    for (const srcPath of sourcePaths) {
      const isFolder = !srcPath.includes('.') || Object.keys(files).some(p => p.startsWith(srcPath + '/'));
      
      if (isFolder) {
        const folderName = srcPath.split('/').pop() || srcPath;
        const newFolderPrefix = cleanTargetFolder ? `${cleanTargetFolder}/${folderName}` : folderName;

        if (newFolderPrefix === srcPath || newFolderPrefix.startsWith(srcPath + '/')) {
          continue;
        }

        Object.keys(files).forEach(p => {
          if (p === srcPath) {
            const content = files[p];
            delete updatedFiles[p];
            updatedFiles[newFolderPrefix] = content;
          } else if (p.startsWith(srcPath + '/')) {
            const remainingPath = p.substring(srcPath.length + 1);
            const newPath = `${newFolderPrefix}/${remainingPath}`;
            const content = files[p];
            delete updatedFiles[p];
            updatedFiles[newPath] = content;
          }
        });
      } else {
        const fileName = srcPath.split('/').pop() || srcPath;
        const newPath = cleanTargetFolder ? `${cleanTargetFolder}/${fileName}` : fileName;

        if (newPath === srcPath) continue;

        updatedFiles[newPath] = files[srcPath];
        delete updatedFiles[srcPath];

        if (selectedFilePath === srcPath) {
          setSelectedFilePath(newPath);
        }
      }
    }

    updateProject({
      files: updatedFiles,
      code: getMergedHtml(updatedFiles)
    });

    setMultiSelectedPaths(new Set());
  };

  const deleteMultiplePaths = (paths: string[]) => {
    setCustomDialog({
      type: 'confirm',
      message: lang === 'vi'
        ? `Bạn có chắc chắn muốn xóa ${paths.length} mục đã chọn cùng toàn bộ nội dung bên trong?`
        : `Are you sure you want to delete ${paths.length} selected items and all their contents?`,
      onConfirm: () => {
        const files = currentProject.files || {};
        const updatedFiles = { ...files };

        paths.forEach(p => {
          const isFolder = !p.includes('.') || Object.keys(files).some(filePath => filePath.startsWith(p + '/'));
          if (isFolder) {
            Object.keys(files).forEach(filePath => {
              if (filePath === p || filePath.startsWith(p + '/')) {
                delete updatedFiles[filePath];
              }
            });
          } else {
            delete updatedFiles[p];
          }
        });

        updateProject({
          files: updatedFiles,
          code: getMergedHtml(updatedFiles)
        });

        setMultiSelectedPaths(new Set());
        
        if (paths.some(p => selectedFilePath === p || selectedFilePath.startsWith(p + '/'))) {
          setSelectedFilePath('index.html');
        }
      }
    });
  };

  const toggleMultiSelectPath = (path: string) => {
    setMultiSelectedPaths(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const downloadMultiplePaths = async (paths: string[]) => {
    try {
      const zipName = currentProject.name || 'project_export';
      await downloadPathsAsZip(paths, zipName);
      setMultiSelectedPaths(new Set());
    } catch (err: any) {
      setCustomDialog({
        type: 'alert',
        message: lang === 'vi' ? `Có lỗi xảy ra khi đóng gói ZIP: ${err.message}` : `Error creating ZIP: ${err.message}`,
        onConfirm: () => {}
      });
    }
  };

  const renderNode = (node: TreeNode): React.ReactNode => {
    if (node.path === '') {
      return (
        <div className="flex flex-col gap-1">
          {node.children.map(child => renderNode(child))}
        </div>
      );
    }

    const isSelected = node.path === selectedFilePath;
    const isExpanded = expandedFolders.has(node.path);

    const handleDragStartNode = (e: React.DragEvent) => {
      e.stopPropagation();
      e.dataTransfer.setData('text/plain', node.path);
    };

    const handleDragOverNode = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDropNode = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const sourcePath = e.dataTransfer.getData('text/plain');
      if (!sourcePath || sourcePath === node.path) return;

      if (node.isFolder) {
        moveFileOrFolder(sourcePath, node.path);
      }
    };

    return (
      <div key={node.path} className="flex flex-col w-full">
        <div
          draggable={node.path !== 'index.html'}
          onDragStart={handleDragStartNode}
          onDragOver={handleDragOverNode}
          onDrop={handleDropNode}
          onTouchStart={(e) => {
            if (node.path === 'index.html') return;
            setTouchDragSource(node.path);
            const touch = e.touches[0];
            const x = touch.clientX;
            const y = touch.clientY;
            const t = setTimeout(() => {
              setContextMenu({
                x,
                y,
                nodePath: node.path,
                isFolder: node.isFolder
              });
            }, 600);
            (window as any)[`longpress_${node.path}`] = t;
          }}
          onTouchMove={(e) => {
            if ((window as any)[`longpress_${node.path}`]) {
              clearTimeout((window as any)[`longpress_${node.path}`]);
              delete (window as any)[`longpress_${node.path}`];
            }
            if (!touchDragSource) return;
            const touch = e.touches[0];
            const elem = document.elementFromPoint(touch.clientX, touch.clientY);
            if (!elem) return;
            const targetRow = elem.closest('[data-path]');
            if (targetRow) {
              const path = targetRow.getAttribute('data-path');
              const isFolder = targetRow.getAttribute('data-is-folder') === 'true';
              if (path && isFolder && path !== touchDragSource) {
                setTouchDragOver(path);
              } else {
                setTouchDragOver(null);
              }
            } else {
              setTouchDragOver(null);
            }
          }}
          onTouchEnd={(e) => {
            if ((window as any)[`longpress_${node.path}`]) {
              clearTimeout((window as any)[`longpress_${node.path}`]);
              delete (window as any)[`longpress_${node.path}`];
            }
            if (!touchDragSource) return;
            const touch = e.changedTouches[0];
            const elem = document.elementFromPoint(touch.clientX, touch.clientY);
            setTouchDragSource(null);
            setTouchDragOver(null);
            if (!elem) return;
            const targetRow = elem.closest('[data-path]');
            if (targetRow) {
              const targetPath = targetRow.getAttribute('data-path');
              const isFolder = targetRow.getAttribute('data-is-folder') === 'true';
              if (targetPath && targetPath !== touchDragSource && isFolder) {
                moveFileOrFolder(touchDragSource, targetPath);
              }
            } else if (elem.closest('[data-tree-root]')) {
              moveFileOrFolder(touchDragSource, '');
            }
          }}
          onMouseDown={(e) => {
            if (node.path === 'index.html') return;
            const x = e.clientX;
            const y = e.clientY;
            const t = setTimeout(() => {
              setContextMenu({
                x,
                y,
                nodePath: node.path,
                isFolder: node.isFolder
              });
            }, 600);
            (window as any)[`longpress_mouse_${node.path}`] = t;
          }}
          onMouseMove={(e) => {
            if ((window as any)[`longpress_mouse_${node.path}`]) {
              clearTimeout((window as any)[`longpress_mouse_${node.path}`]);
              delete (window as any)[`longpress_mouse_${node.path}`];
            }
          }}
          onMouseUp={(e) => {
            if ((window as any)[`longpress_mouse_${node.path}`]) {
              clearTimeout((window as any)[`longpress_mouse_${node.path}`]);
              delete (window as any)[`longpress_mouse_${node.path}`];
            }
          }}
          onContextMenu={(e) => {
            if (node.path === 'index.html') return;
            e.preventDefault();
            e.stopPropagation();
            setContextMenu({
              x: e.clientX,
              y: e.clientY,
              nodePath: node.path,
              isFolder: node.isFolder
            });
          }}
          data-path={node.path}
          data-is-folder={node.isFolder ? 'true' : 'false'}
          onClick={(e) => {
            e.stopPropagation();
            if (isSelectMode) {
              toggleMultiSelectPath(node.path);
            } else {
              if (node.isFolder) {
                toggleFolder(node.path);
              } else {
                setSelectedFilePath(node.path);
              }
            }
          }}
          className={`flex items-center justify-between group px-2 py-1.5 rounded-md text-xs cursor-pointer transition-all ${
            isSelected && !isSelectMode
              ? 'bg-indigo-600 text-white font-semibold shadow-sm' 
              : (theme === 'dark' ? 'hover:bg-slate-800 text-slate-400 hover:text-slate-200' : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900')
          } ${touchDragSource === node.path ? 'opacity-40 scale-95' : ''} ${touchDragOver === node.path ? 'ring-2 ring-indigo-500 bg-indigo-500/20' : ''}`}
        >
          <div className="flex items-center gap-1.5 truncate pr-2">
            {isSelectMode && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMultiSelectPath(node.path);
                }}
                className="mr-2 flex items-center justify-center flex-shrink-0 cursor-pointer"
              >
                {multiSelectedPaths.has(node.path) ? (
                  <div className="w-4 h-4 rounded-full bg-emerald-500 border border-emerald-600 flex items-center justify-center text-[10px] text-white font-bold animate-in zoom-in-50 duration-150">
                    ✓
                  </div>
                ) : (
                  <div className={`w-4 h-4 rounded-full border transition-all ${theme === 'dark' ? 'border-slate-700 bg-slate-900 hover:border-slate-500' : 'border-slate-350 bg-white hover:border-slate-400'}`} />
                )}
              </div>
            )}
            
            {node.isFolder ? (
              <span className="flex items-center gap-1 flex-shrink-0">
                {isExpanded ? <ChevronDown className="w-3 h-3 text-slate-400" /> : <ChevronRight className="w-3 h-3 text-slate-400" />}
                <Folder className={`w-3.5 h-3.5 ${isSelected && !isSelectMode ? 'text-white' : 'text-amber-500'}`} />
              </span>
            ) : (
              <span className="flex items-center gap-1 pl-4 flex-shrink-0">
                {node.name.endsWith('.html') && <Code className={`w-3.5 h-3.5 ${isSelected && !isSelectMode ? 'text-white' : 'text-orange-400'}`} />}
                {node.name.endsWith('.css') && <FileCode className={`w-3.5 h-3.5 ${isSelected && !isSelectMode ? 'text-white' : 'text-blue-400'}`} />}
                {node.name.endsWith('.js') && <FileCode className={`w-3.5 h-3.5 ${isSelected && !isSelectMode ? 'text-white' : 'text-amber-400'}`} />}
                {node.name.endsWith('.json') && <FileJson className={`w-3.5 h-3.5 ${isSelected && !isSelectMode ? 'text-white' : 'text-teal-400'}`} />}
                {node.name.endsWith('.md') && <FileText className={`w-3.5 h-3.5 ${isSelected && !isSelectMode ? 'text-white' : 'text-emerald-400'}`} />}
                {node.name.endsWith('.py') && <FileCode className={`w-3.5 h-3.5 ${isSelected && !isSelectMode ? 'text-white' : 'text-emerald-500'}`} />}
                {(node.name.endsWith('.ts') || node.name.endsWith('.tsx')) && <FileCode className={`w-3.5 h-3.5 ${isSelected && !isSelectMode ? 'text-white' : 'text-blue-500'}`} />}
                {!['.html', '.css', '.js', '.json', '.md', '.py', '.ts', '.tsx'].some(ext => node.name.endsWith(ext)) && <File className={`w-3.5 h-3.5 ${isSelected && !isSelectMode ? 'text-white' : 'text-slate-400'}`} />}
              </span>
            )}
            <span className="truncate">{node.name}</span>
          </div>

          {node.path !== 'index.html' && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const rect = e.currentTarget.getBoundingClientRect();
                  setContextMenu({
                    x: rect.left,
                    y: rect.bottom + 4,
                    nodePath: node.path,
                    isFolder: node.isFolder
                  });
                }}
                className={`p-1 rounded transition-all ${isSelected && !isSelectMode ? 'text-indigo-200 hover:text-white' : 'text-slate-400 hover:text-indigo-500 hover:bg-indigo-500/10'}`}
                title={lang === 'vi' ? 'Tùy chọn' : 'Options'}
              >
                <Sliders className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCustomDialog({
                    type: 'confirm',
                    message: lang === 'vi' 
                      ? `Bạn có chắc chắn muốn xóa ${node.isFolder ? 'thư mục và tất cả nội dung bên trong' : 'file'}: ${node.path}?` 
                      : `Are you sure you want to delete ${node.isFolder ? 'folder and all its contents' : 'file'}: ${node.path}?`,
                    onConfirm: () => {
                      const files = currentProject.files || {};
                      const updatedFiles = { ...files };
                      
                      if (node.isFolder) {
                        Object.keys(files).forEach(p => {
                          if (p === node.path || p.startsWith(node.path + '/')) {
                            delete updatedFiles[p];
                          }
                        });
                      } else {
                        delete updatedFiles[node.path];
                      }

                      updateProject({
                        files: updatedFiles,
                        code: getMergedHtml(updatedFiles)
                      });
                      
                      if (selectedFilePath === node.path || selectedFilePath.startsWith(node.path + '/')) {
                        setSelectedFilePath('index.html');
                      }
                    }
                  });
                }}
                className={`p-1 rounded transition-all hover:bg-red-500/15 ${isSelected && !isSelectMode ? 'text-indigo-200 hover:text-white' : 'text-slate-400 hover:text-red-500'}`}
                title={lang === 'vi' ? 'Xóa' : 'Delete'}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {node.isFolder && isExpanded && (
          <div className="pl-3 border-l border-slate-200 dark:border-slate-800 ml-2.5 mt-0.5 flex flex-col gap-1">
            {node.children.map(child => renderNode(child))}
            {node.children.length === 0 && (
              <span className="text-[10px] italic text-slate-400 dark:text-slate-500 pl-4 py-0.5">
                {lang === 'vi' ? '(Thư mục trống)' : '(Empty folder)'}
              </span>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderFileTree = () => {
    const files = currentProject.files || {};
    const tree = buildTree(files);

    const handleDragOverRoot = (e: React.DragEvent) => {
      e.preventDefault();
    };

    const handleDropRoot = (e: React.DragEvent) => {
      e.preventDefault();
      const sourcePath = e.dataTransfer.getData('text/plain');
      if (!sourcePath) return;
      moveFileOrFolder(sourcePath, '');
    };

    return (
      <div 
        onDragOver={handleDragOverRoot}
        onDrop={handleDropRoot}
        data-tree-root="true"
        className={`w-56 md:w-64 border-r flex flex-col select-none transition-colors ${theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}
      >
        <div className={`p-3 font-semibold text-xs uppercase tracking-wider flex items-center justify-between border-b ${theme === 'dark' ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-500'}`}>
          <span>Duyệt File</span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleSelectMode}
              className={`p-1 rounded transition-colors ${
                isSelectMode 
                  ? 'bg-indigo-500/20 text-indigo-500 font-bold' 
                  : 'hover:bg-slate-500/10 text-slate-400 hover:text-indigo-500'
              }`}
              title={lang === 'vi' ? 'Chế độ chọn nhiều' : 'Multi-selection mode'}
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={handleAddFilePrompt}
              className="p-1 hover:bg-indigo-500/15 rounded text-indigo-500 transition-colors"
              title={lang === 'vi' ? 'Thêm file/thư mục mới' : 'Add new file/folder'}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {isSelectMode && (
          <div className={`p-2 border-b flex flex-col gap-1.5 transition-all ${
            theme === 'dark' ? 'bg-slate-850/80 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400 px-1">
              <span>
                {lang === 'vi' 
                  ? `Đã chọn ${multiSelectedPaths.size} mục` 
                  : `Selected ${multiSelectedPaths.size} items`}
              </span>
              {multiSelectedPaths.size > 0 && (
                <button
                  onClick={() => setMultiSelectedPaths(new Set())}
                  className="text-indigo-500 hover:underline cursor-pointer"
                >
                  {lang === 'vi' ? 'Bỏ chọn' : 'Deselect'}
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-3 gap-1">
              <button
                disabled={multiSelectedPaths.size === 0}
                onClick={() => {
                  setMoveTargetPaths(Array.from(multiSelectedPaths));
                  setTargetFolderSelection('');
                  setNewFolderNameInput('');
                }}
                className="py-1 px-1.5 border rounded text-[10px] font-medium flex items-center justify-center gap-1 transition-all disabled:opacity-40 disabled:hover:bg-transparent bg-indigo-500/10 border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/25 cursor-pointer"
                title={lang === 'vi' ? 'Cho vào thư mục' : 'Move into folder'}
              >
                <Folder className="w-3 h-3" />
                {lang === 'vi' ? 'Di chuyển' : 'Move'}
              </button>
              
              <button
                disabled={multiSelectedPaths.size === 0}
                onClick={() => {
                  deleteMultiplePaths(Array.from(multiSelectedPaths));
                }}
                className="py-1 px-1.5 border rounded text-[10px] font-medium flex items-center justify-center gap-1 transition-all disabled:opacity-40 disabled:hover:bg-transparent bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/25 cursor-pointer"
                title={lang === 'vi' ? 'Xóa mục chọn' : 'Delete selection'}
              >
                <Trash2 className="w-3 h-3" />
                {lang === 'vi' ? 'Xoá' : 'Delete'}
              </button>

              <button
                disabled={multiSelectedPaths.size === 0}
                onClick={() => {
                  downloadMultiplePaths(Array.from(multiSelectedPaths));
                }}
                className="py-1 px-1.5 border rounded text-[10px] font-medium flex items-center justify-center gap-1 transition-all disabled:opacity-40 disabled:hover:bg-transparent bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/25 cursor-pointer"
                title={lang === 'vi' ? 'Tải zip' : 'Download ZIP'}
              >
                <Download className="w-3 h-3" />
                {lang === 'vi' ? 'Tải ZIP' : 'ZIP'}
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto pl-2 py-2 pr-4 flex flex-col gap-1 min-h-[150px]">
          {renderNode(tree)}
        </div>
        <div className={`p-2 text-[10px] text-center border-t border-dashed ${theme === 'dark' ? 'border-slate-800 text-slate-500' : 'border-slate-200 text-slate-400'}`}>
          {lang === 'vi' ? 'Kéo thả file/thư mục để di chuyển' : 'Drag & drop files/folders to move'}
        </div>
      </div>
    );
  };

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  }, [projects]);

  // Track project transitions to update lastUsedAt
  useEffect(() => {
    setProjects(prev => prev.map(p => p.id === currentId ? { ...p, lastUsedAt: Date.now() } : p));
  }, [currentId]);

  // Interval check: every 100 seconds, if non-safeMode, keep project count max to 10
  useEffect(() => {
    if (safeMode) return;
    const interval = setInterval(() => {
      setProjects(prev => {
        if (prev.length > 10) {
          const sorted = [...prev].sort((a, b) => (b.lastUsedAt || 0) - (a.lastUsedAt || 0));
          const kept = sorted.slice(0, 10);
          const keptIds = kept.map(k => k.id);
          if (!keptIds.includes(currentId) && kept[0]) {
            setCurrentId(kept[0].id);
          }
          return kept;
        }
        return prev;
      });
    }, 100000); // 100 seconds
    return () => clearInterval(interval);
  }, [safeMode, currentId]);

  // 30 days unused projects auto-cleanup check on start
  useEffect(() => {
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    setProjects(prev => {
      const validProjects = prev.filter(p => {
        const lastUsed = p.lastUsedAt || now;
        return (now - lastUsed) <= thirtyDaysMs;
      });

      if (validProjects.length === 0) {
        return [{ ...defaultProject, lastUsedAt: now }];
      }

      const deletedCount = prev.length - validProjects.length;
      if (deletedCount > 0) {
        setTimeout(() => {
          console.log(`[Cleaned] Removed ${deletedCount} unused projects older than 30 days.`);
        }, 1200);
      }
      return validProjects;
    });
  }, []);

  useEffect(() => {
    setLogs([]);
  }, [currentId]);

  // UI State
  const [input, setInput] = useState('');
  const [activeTab, setActiveTab] = useState<TabState>('preview');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingTime, setLoadingTime] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [usedModelIndicator, setUsedModelIndicator] = useState<string>('');

  const [attachments, setAttachments] = useState<{name: string, dataUrl: string}[]>([]);
  
  const aiStatuses = ["Đang xem lại code...", "Đang fix code...", "Đang đưa ý tưởng...", "Đang viết game..."];
  const [loadingStatus, setLoadingStatus] = useState(aiStatuses[0]);
  const [isCurrentCodingRequest, setIsCurrentCodingRequest] = useState(false);

  // Modals
  const [showSettings, setShowSettings] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');

  // API Keys state
  const [apiKeyPrimary, setApiKeyPrimary] = useState(() => localStorage.getItem('gemini_api_key_primary') || '');
  const [apiKeySecondary, setApiKeySecondary] = useState(() => localStorage.getItem('gemini_api_key_secondary') || '');

  useEffect(() => {
    localStorage.setItem('gemini_api_key_primary', apiKeyPrimary);
  }, [apiKeyPrimary]);

  useEffect(() => {
    localStorage.setItem('gemini_api_key_secondary', apiKeySecondary);
  }, [apiKeySecondary]);

  // Last Error for Auto-Fix
  const [lastError, setLastError] = useState<string | null>(null);

  // View Changes Modal State
  const [showChangesModal, setShowChangesModal] = useState(false);

  // Theme Variations Quick Generator States
  const [themesLoading, setThemesLoading] = useState(false);
  const [themesData, setThemesData] = useState<{ 
    Neon?: string; 
    Clean?: string; 
    Light?: string; 
    Dark?: string;
    metadata?: {
      name: string;
      description: string;
      idea: string;
      fileStructure: string[];
      filesLogic: { path: string; logic: string; purpose: string }[];
    };
    readme?: string;
  } | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const pendingThemeRef = useRef<string | null>(null);

  // Suggestions for autocomplete helper
  const SUGGESTIONS = [
    "Tạo game bắn súng vũ trụ di chuyển tránh chướng ngại vật cực hay",
    "Tạo game Flappy Bird phong cách Neon rực rỡ và lẫy lừng",
    "Tạo game rắn săn mồi 3D mượt mà hiệu ứng ánh sáng đẹp mắt",
    "Tạo game xếp gạch Tetris cổ điển phong cách Cyberpunk âm nhạc sôi động"
  ];

  // Console log state
  interface LogItem {
    type: 'log' | 'error' | 'warn';
    message: string;
    timestamp: string;
  }
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [showLogsPanel, setShowLogsPanel] = useState(false);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'IFRAME_LOG') {
        const { logType, message } = event.data;
        const now = new Date().toLocaleTimeString();
        setLogs(prev => [...prev, { type: logType, message, timestamp: now }]);
        
        // Save the last runtime console error for our chat automatic Fix button
        if (logType === 'error') {
          setLastError(message);
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const getInjectedCode = (rawCode: string) => {
    if (!rawCode) return '';
    const hookScript = `
<script>
  (function() {
    // Intercept and bypass sandboxed localStorage/sessionStorage blocks
    try {
      var testStorage = window.localStorage;
    } catch (e) {
      var memoStorage = {
        _data: {},
        setItem: function(k, v) { this._data[k] = String(v); },
        getItem: function(k) { return this._data.hasOwnProperty(k) ? this._data[k] : null; },
        removeItem: function(k) { delete this._data[k]; },
        clear: function() { this._data = {}; },
        key: function(i) { return Object.keys(this._data)[i] || null; },
        get length() { return Object.keys(this._data).length; }
      };
      try {
        Object.defineProperty(window, 'localStorage', { value: memoStorage, configurable: true, enumerable: true, writable: true });
        Object.defineProperty(window, 'sessionStorage', { value: memoStorage, configurable: true, enumerable: true, writable: true });
      } catch (err) {
        window.localStorage = memoStorage;
        window.sessionStorage = memoStorage;
      }
    }

    const _log = console.log;
    const _error = console.error;
    const _warn = console.warn;
    
    window.addEventListener('error', function(e) {
      window.parent.postMessage({
        type: 'IFRAME_LOG',
        logType: 'error',
        message: e.message + ' (ở dòng ' + e.lineno + ')'
      }, '*');
    });

    window.addEventListener('unhandledrejection', function(e) {
      window.parent.postMessage({
        type: 'IFRAME_LOG',
        logType: 'error',
        message: 'Uncaught Promise Rejection: ' + (e.reason ? (e.reason.message || String(e.reason)) : 'Unknown promise error')
      }, '*');
    });

    window.alert = function(msg) {
      console.error('[Alert Blocked] ' + msg);
    };
    window.confirm = function(msg) {
      console.error('[Confirm Blocked] ' + msg);
      return true;
    };
    window.prompt = function(msg) {
      console.error('[Prompt Blocked] ' + msg);
      return '';
    };

    console.log = function(...args) {
      const msg = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
      if (msg.includes('cdn.tailwindcss.com') || msg.includes('tailwindcss.com/docs/installation')) return;
      _log.apply(console, args);
      window.parent.postMessage({
        type: 'IFRAME_LOG',
        logType: 'log',
        message: msg
      }, '*');
    };

    console.error = function(...args) {
      const msg = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
      if (msg.includes('cdn.tailwindcss.com') || msg.includes('tailwindcss.com/docs/installation')) return;
      _error.apply(console, args);
      window.parent.postMessage({
        type: 'IFRAME_LOG',
        logType: 'error',
        message: msg
      }, '*');
    };

    console.warn = function(...args) {
      const msg = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
      if (msg.includes('cdn.tailwindcss.com') || msg.includes('tailwindcss.com/docs/installation')) return;
      _warn.apply(console, args);
      window.parent.postMessage({
        type: 'IFRAME_LOG',
        logType: 'warn',
        message: msg
      }, '*');
    };
  })();
</script>
    `;
    
    if (rawCode.includes('<head>')) {
      return rawCode.replace('<head>', `<head>${hookScript}`);
    } else if (rawCode.includes('<HEAD>')) {
      return rawCode.replace('<HEAD>', `<HEAD>${hookScript}`);
    } else {
      return hookScript + rawCode;
    }
  };

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1-second interval ticker to guarantee real-time updates and refresh console log & error states every second
  const [ticker, setTicker] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setTicker(t => t + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [currentProject.messages]);

  // Auto-detect and respond to [!readfile:...] commands in model responses
  useEffect(() => {
    if (isLoading) return;
    const messages = currentProject.messages;
    if (!messages || messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.role === 'model' && lastMsg.text) {
      const readfileRegex = /\[!readfile:([^\]]+)\]/g;
      let match;
      const filesToRead: string[] = [];
      while ((match = readfileRegex.exec(lastMsg.text)) !== null) {
        filesToRead.push(match[1].trim());
      }

      if (filesToRead.length > 0 && currentProject.files) {
        const fileContentsList = filesToRead.map(filePath => {
          const content = currentProject.files?.[filePath] !== undefined 
            ? currentProject.files[filePath] 
            : "(File không tồn tại hoặc rỗng)";
          return `--- FILE: ${filePath} ---\n${content}\n--- END FILE: ${filePath} ---`;
        });

        const autoResponsePrompt = `Đây là nội dung các file bạn yêu cầu đọc:\n\n${fileContentsList.join('\n\n')}\n\nHãy tiếp tục thực hiện yêu cầu của người dùng bằng cách chỉnh sửa hoặc tạo mới file bằng các cú pháp [!editfile:đường_dẫn_file] hoặc [!createnew file:đường_dẫn_file] nếu cần thiết.`;

        // Loop prevention check
        const lastUserMsg = messages.length >= 2 ? messages[messages.length - 2] : null;
        if (lastUserMsg && lastUserMsg.role === 'user' && lastUserMsg.text.includes("Đây là nội dung các file bạn yêu cầu đọc") && filesToRead.every(f => lastUserMsg.text.includes(`--- FILE: ${f} ---`))) {
          console.warn("Prevented infinite readfile loop for", filesToRead);
          return;
        }

        setTimeout(() => {
          handleSend(autoResponsePrompt);
        }, 300);
      }
    }
  }, [currentProject.messages, isLoading]);

  // Auto-detect and respond to [!findlibrary:...] commands in model responses
  useEffect(() => {
    if (isLoading) return;
    const messages = currentProject.messages;
    if (!messages || messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.role === 'model' && lastMsg.text) {
      const findlibraryRegex = /\[!findlibrary:([^\]]+)\]/g;
      let match;
      const queriesToFind: string[] = [];
      while ((match = findlibraryRegex.exec(lastMsg.text)) !== null) {
        queriesToFind.push(match[1].trim());
      }

      if (queriesToFind.length > 0) {
        const resultsList = queriesToFind.map(queryStr => {
          const query = queryStr.toLowerCase();
          const foundLibs = PYTHON_LIBRARIES_DB.filter(l => l.name.toLowerCase().includes(query));
          const libResults = foundLibs.length > 0
            ? foundLibs.map(l => `- **${l.name}** (${l.size}MB): ${l.desc} [${downloadedLibraries.includes(l.name) ? 'ĐÃ TẢI / DOWNLOADED' : 'CHƯA TẢI / NOT DOWNLOADED'}]`).join('\n')
            : `Không tìm thấy thư viện nào khớp với từ khóa '${queryStr}' trong kho dữ liệu.`;
          return `--- KẾT QUẢ TÌM THƯ VIỆN CHO: '${queryStr}' ---\n${libResults}\n--- HẾT KẾT QUẢ ---`;
        });

        const autoResponsePrompt = `Đây là kết quả tìm kiếm thư viện trong database hệ thống của bạn:\n\n${resultsList.join('\n\n')}\n\nHãy tiếp tục phản hồi người dùng. Nếu thư viện CHƯA TẢI, hãy hướng dẫn người dùng tải xuống bằng cách gõ 'pip install <tên_thư_viện>' trong Terminal ảo hoặc nhấn nút 'Tải xuống' trong Python Library Manager.`;

        // Loop prevention check
        const lastUserMsg = messages.length >= 2 ? messages[messages.length - 2] : null;
        if (lastUserMsg && lastUserMsg.role === 'user' && lastUserMsg.text.includes("Đây là kết quả tìm kiếm thư viện trong database hệ thống") && queriesToFind.every(q => lastUserMsg.text.includes(`'${q}'`))) {
          console.warn("Prevented infinite findlibrary loop for", queriesToFind);
          return;
        }

        setTimeout(() => {
          handleSend(autoResponsePrompt);
        }, 300);
      }
    }
  }, [currentProject.messages, isLoading, downloadedLibraries]);

  useEffect(() => {
    if (isLoading) {
      setLoadingTime(0);
      let i = 0;
      const statusInterval = setInterval(() => {
        i = (i + 1) % aiStatuses.length;
        setLoadingStatus(aiStatuses[i]);
      }, 2000);
      
      const timerInterval = setInterval(() => {
        setLoadingTime(prev => prev + 1);
      }, 1000);

      return () => {
        clearInterval(statusInterval);
        clearInterval(timerInterval);
      };
    }
  }, [isLoading]);

  const compressImage = (dataUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = dataUrl;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = 12; // 12x12 px to guarantee <800 characters
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, size, size);
          resolve(canvas.toDataURL('image/jpeg', 0.1));
        } else {
          resolve(dataUrl.substring(0, 800));
        }
      };
      img.onerror = () => resolve(dataUrl.substring(0, 800));
    });
  };

  const compressAudio = async (arrayBuffer: ArrayBuffer): Promise<string> => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return "data:audio/wav;base64,UklGRiUAAABXQVZFMmZtdCAAEAAAAAEAAQBARAAAAQQAAgAgAGRhdGEAAAAAAA==";
      const ctx = new AudioContextClass();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      
      const targetSampleRate = 1000;
      const duration = Math.min(audioBuffer.duration, 0.3);
      const numSamples = Math.floor(targetSampleRate * duration);
      
      const channelData = audioBuffer.getChannelData(0);
      const downsampled = new Uint8Array(numSamples);
      
      for (let i = 0; i < numSamples; i++) {
        const origX = Math.floor(i * audioBuffer.sampleRate / targetSampleRate);
        const val = channelData[origX] || 0;
        downsampled[i] = Math.max(0, Math.min(255, Math.floor((val + 1.0) * 127.5)));
      }
      
      const wavBuffer = new ArrayBuffer(44 + numSamples);
      const view = new DataView(wavBuffer);
      
      view.setUint32(0, 0x52494646, false); // "RIFF"
      view.setUint32(4, 36 + numSamples, true); // size
      view.setUint32(8, 0x57415645, false); // "WAVE"
      view.setUint32(12, 0x666d7420, false); // "fmt "
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true); // PCM
      view.setUint16(22, 1, true); // mono
      view.setUint32(24, targetSampleRate, true);
      view.setUint32(28, targetSampleRate, true);
      view.setUint16(32, 1, true);
      view.setUint16(34, 8, true);
      view.setUint32(36, 0x64617461, false); // "data"
      view.setUint32(40, numSamples, true);
      
      const wavBytes = new Uint8Array(wavBuffer);
      wavBytes.set(downsampled, 44);
      
      let binary = '';
      for (let i = 0; i < wavBytes.byteLength; i++) {
        binary += String.fromCharCode(wavBytes[i]);
      }
      const b64 = window.btoa(binary);
      const res = `data:audio/wav;base64,${b64}`;
      return res.substring(0, 800);
    } catch {
      return "data:audio/wav;base64,UklGRiUAAABXQVZFMmZtdCAAEAAAAAEAAQBARAAAAQQAAgAgAGRhdGEAAAAAAA==";
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    Array.from(files).forEach((file: File) => {
      if (file.type.startsWith('audio')) {
        const reader = new FileReader();
        reader.onload = async (event) => {
          const buffer = event.target?.result as ArrayBuffer;
          const compressed = await compressAudio(buffer);
          setAttachments(prev => [...prev, { name: file.name, dataUrl: compressed }]);
        };
        reader.readAsArrayBuffer(file);
      } else if (file.type.startsWith('image')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const dataUrl = event.target?.result as string;
          compressImage(dataUrl).then((compressed) => {
            setAttachments(prev => [...prev, { name: file.name, dataUrl: compressed }]);
          });
        };
        reader.readAsDataURL(file);
      } else {
        // Fallback for other file types if any
        const reader = new FileReader();
        reader.onload = (event) => {
          const dataUrl = event.target?.result as string;
          setAttachments(prev => [...prev, { name: file.name, dataUrl: dataUrl.substring(0, 800) }]);
        };
        reader.readAsDataURL(file);
      }
    });
    
    e.target.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const selectAndApplyTheme = (themeName: string) => {
    setSelectedTheme(themeName);
    
    const themeMarkup = themesData?.[themeName as keyof typeof themesData] as string || '';
    let updatedFiles = currentProject.files ? { ...currentProject.files } : {};
    
    // Always write index.html with the selected theme's code
    updatedFiles['index.html'] = themeMarkup;
    
    // If metadata and readme are available in themesData, write them
    if (themesData?.metadata) {
      updatedFiles['metadata.json'] = JSON.stringify(themesData.metadata, null, 2);
    }
    if (themesData?.readme) {
      updatedFiles['readme.md'] = themesData.readme;
    }
    
    const projName = themesData?.metadata?.name || currentProject.name;
    const mergedCode = getMergedHtml(updatedFiles);
    
    updateProject({
      code: mergedCode,
      files: updatedFiles,
      name: projName,
      mode: 'full' // Switch to VFS / full mode to utilize metadata.json and readme.md
    });
    
    const themeInstruction = `Tạo game theo thiết kế và cấu trúc chi tiết được mô tả trong metadata.json và readme.md`;
    
    if (!isLoading) {
      handleSend(themeInstruction);
      setThemesData(null);
      setSelectedTheme(null);
    } else {
      pendingThemeRef.current = themeInstruction;
    }
  };

  const handleSend = async (overridePrompt?: string) => {
    const promptToUse = overridePrompt !== undefined ? overridePrompt : input;
    if ((!promptToUse.trim() && attachments.length === 0) || isLoading) return;
    
    // Reset previous errors when a new layout task starts
    setLastError(null);

    const startTime = Date.now();

    const modeHeader = currentProject.mode === 'full'
      ? `[CHẾ ĐỘ HIỆN TẠI: BẢN ĐẦY ĐỦ (FULL MULTI-FILE VFS MODE)]
Mọi hành động thêm/sửa/xóa file BẮT BUỘC phải dùng cú pháp VFS Tag Rules:
1. Tạo/Thêm file mới: [!createnew file:đường_dẫn_file]
2. Chỉnh sửa toàn bộ file: [!editfile:đường_dẫn_file]
3. Xóa file: [!deletefile:đường_dẫn_file]
4. Đọc file: [!readfile:đường_dẫn_file]
Cấm tuyệt đối viết code HTML hay CSS trần trụi ngoài các block tag trên! Không được hiểu lầm sang chế độ single-file html nhanh.`
      : `[CHẾ ĐỘ HIỆN TẠI: BẢN NHANH (QUICK SINGLE-FILE HTML MODE)]
Bạn chỉ đang làm việc trên 1 file HTML duy nhất. Toàn bộ code HTML/CSS/JS phải gộp chung vào một chỗ. KHÔNG được dùng các cú pháp VFS Tag như [!createnew file:...] hay [!editfile:...] vì đây không phải chế độ Bản đầy đủ.`;

    let baseSystemInstruction = currentProject.systemInstruction;
    if (currentProject.mode === 'quick') {
      baseSystemInstruction = baseSystemInstruction
        .split('\n\n')
        .filter(block => {
          const lower = block.toLowerCase();
          return !(
            lower.includes('virtual file system') ||
            lower.includes('vfs') ||
            lower.includes('multi-file') ||
            lower.includes('[!createnew') ||
            lower.includes('structure rules') ||
            lower.includes('output flow:')
          );
        })
        .join('\n\n');

      const quickModeRules = `
- Project Style: "Quick Version" Single-file HTML Canvas/Web Game. Everything (HTML, Tailwind CSS, Javascript) must be written inside a single "index.html" file.
- Single File Constraint: DO NOT use any multi-file or VFS tags (such as [!createnew file:...], [!editfile:...], [!deletefile:...]). They are strictly forbidden in this mode!
- Output Rule: If the user requests code modifications or updates, always output the entire complete, updated index.html inside a single \`\`\`html ... \`\`\` code block. Ensure that all styles and game logic are bundled directly within that index.html.
`;
      baseSystemInstruction = baseSystemInstruction + "\n\n" + quickModeRules;
    }

    const combinedSystemInstruction = [
      modeHeader,
      baseSystemInstruction,
      currentProject.additionalSystemInstruction
    ].filter(Boolean).join('\n\n');

    const codeKeywords = [
      'tạo', 'làm', 'made', 'create', 'code', 'mã', 'script', 'lỗi', 'error', 'warning', 'invaild', 'sửa', 'fix', 'game', 'build', 'run', 'chạy', 'gameplay', 'failed', 'uncaught', 'theme', 'design', 'giao diện', 'apply',
      'xấu', 'hãy', 'đẹp', 'tốt', 'ok', 'ổn', 'ổm', 'ấy', 'lại', 'ko', 'không', 'đc', 'được', 'thấy', 'hiện', 'có', 'thêm', 'add', 'kết', 'nối', 'cao', 'to', 'bé', 'thấp', 'hạ', 'tăng', 'giảm', 'màu', 'còn', 'hơn', 'chút', 'nữa',
      'make', 'bad', 'ugly', 'beautiful', 'nice', 'good', 'fine', 'okay', 'well', 'redo', 'again', 'no', 'not', 'can', 'cant', 'see', 'show', 'have', 'has', 'high', 'tall', 'big', 'small', 'low', 'short', 'lower', 'increase', 'decrease', 'color', 'still', 'more', 'further', 'little', 'bit', 'add', 'connect', 'new', 'button', 'text', 'style', 'background'
    ];
    const isCoding = codeKeywords.some(kw => promptToUse.toLowerCase().includes(kw));
    setIsCurrentCodingRequest(isCoding);

    const userMsg: Message = { 
      role: 'user', 
      text: promptToUse, 
      codeSnapshot: currentProject.code,
      filesSnapshot: currentProject.files ? { ...currentProject.files } : undefined,
      attachments: attachments.length > 0 ? [...attachments] : undefined
    };

    const newMessages = [...currentProject.messages, userMsg];
    const isFirstTime = currentProject.messages.filter(m => m.role === 'user').length === 0;
    
    updateProject({ 
      messages: newMessages,
      previousCode: currentProject.code
    });

    if (overridePrompt === undefined) {
      setInput('');
    }
    setAttachments([]);
    setLogs([]);
    setIsLoading(true);
    setUsedModelIndicator('');

    const controller = new AbortController();
    abortControllerRef.current = controller;

    // If it is the first build, query the secondary API to build visual preview variations!
    if (isFirstTime && isCoding) {
      setThemesLoading(true);
      setThemesData(null);
      setSelectedTheme(null);
      
      fetch('/api/generate_themes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptToUse,
          systemInstruction: combinedSystemInstruction,
          apiKeyPrimary,
          apiKeySecondary,
          secondaryModel: secondaryModel ? secondaryModel.name : undefined,
          secondaryProviderUrl: secondaryModel ? providers.find(p => p.id === secondaryModel.providerId)?.baseUrl : undefined,
          secondaryProviderKey: secondaryModel ? providers.find(p => p.id === secondaryModel.providerId)?.apiKey : undefined,
          existingGames: projects.map(p => p.name),
          aiParams
        }),
        signal: controller.signal
      })
      .then(r => {
        if (!r.ok) throw new Error("API error");
        return r.json();
      })
      .then(data => {
        if (data && (data.Neon || data.Clean || data.Light || data.Dark)) {
          setThemesData(data);
        }
      })
      .catch(err => {
        if (err.name === 'AbortError') {
          console.log("Themes API fetch aborted.");
          return;
        }
        console.warn("Theme API failed, falling back to instant local themes:", err);
        const fallbackThemes = generateLocalThemesFallback(promptToUse, projects);
        setThemesData(fallbackThemes);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setThemesLoading(false);
        }
      });
    }

    let selectedModelItem = customModelsList.find(m => `${m.providerId}:${m.name}` === currentProject.customModel);
    if (!selectedModelItem) {
      selectedModelItem = customModelsList.find(m => m.name === currentProject.customModel);
    }
    const provider = selectedModelItem ? providers.find(p => p.id === selectedModelItem.providerId) : null;
    const isCustomProvider = provider && provider.id !== 'gemini';

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          code: currentProject.code,
          systemInstruction: combinedSystemInstruction,
          customModel: selectedModelItem ? selectedModelItem.name : currentProject.customModel,
          apiKeyPrimary,
          apiKeySecondary,
          providerBaseUrl: isCustomProvider ? provider?.baseUrl : undefined,
          providerApiKey: isCustomProvider ? provider?.apiKey : undefined,
          aiParams,
          mode: currentProject.mode,
          files: currentProject.files,
          availableModels: customModelsList
        }),
        signal: controller.signal
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate');
      }

      let updatedFiles = currentProject.files;
      let updatedCode = currentProject.code;
      let updatedName = currentProject.name;

      if (currentProject.mode === 'full' && currentProject.files) {
        updatedFiles = parseModelCommands(data.text, currentProject.files);
        updatedCode = getMergedHtml(updatedFiles);
        updatedName = getGameNameFromMetadata(updatedFiles, currentProject.name);
      } else {
        updatedCode = data.code || extractHtmlBlock(data.text) || currentProject.code;
      }

      const durationSeconds = Math.max(1, Math.round((Date.now() - startTime) / 1000));

      const modelMsg: Message = { 
        role: 'model', 
        text: data.text, 
        codeSnapshot: updatedCode,
        filesSnapshot: updatedFiles ? { ...updatedFiles } : undefined,
        duration: durationSeconds
      };

      updateProject({ 
        messages: [...newMessages, modelMsg],
        code: updatedCode,
        files: updatedFiles,
        name: updatedName,
        previousCode: currentProject.code
      });
      
      if (updatedCode) {
        setActiveTab('preview');
      }
      setUsedModelIndicator(data.usedModel);

      // Check if a theme style was selected during generation, trigger immediate theme revision prompt
      if (pendingThemeRef.current) {
        const stylePrompt = pendingThemeRef.current;
        pendingThemeRef.current = null;
        setTimeout(() => {
          handleSend(stylePrompt);
        }, 1200);
      }

    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log("Chat fetch aborted.");
        return;
      }
      const durationSeconds = Math.max(1, Math.round((Date.now() - startTime) / 1000));
      const errorMsg: Message = { 
        role: 'model', 
        text: `Error: ${err.message}. Please try again.`,
        codeSnapshot: currentProject.code,
        duration: durationSeconds
      };
      updateProject({ messages: [...newMessages, errorMsg] });
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
      setLogs(prev => [...prev, {
        type: 'warn',
        message: 'Yêu cầu của bạn đã bị dừng.',
        timestamp: new Date().toLocaleTimeString()
      }]);
    }
  };

  const handleUndo = () => {
    const msgs = [...currentProject.messages];
    if (msgs.length <= 1) return;

    // Find the last user message and pop back to it (effectively removing the last AI response and the prompt)
    const newMsgs = msgs.slice(0, -2);
    if (newMsgs.length > 0) {
      const lastMsg = newMsgs[newMsgs.length - 1];
      const lastCode = lastMsg.codeSnapshot || '<!-- Game code will appear here -->';
      const lastFiles = lastMsg.filesSnapshot;
      updateProject({
        messages: newMsgs,
        code: lastCode,
        files: lastFiles
      });
    }
  };

  const handleCreateProject = () => {
    const maxAllowed = safeMode ? 3 : 10;
    if (projects.length >= maxAllowed) {
      setCustomDialog({
        type: 'alert',
        message: lang === 'vi' ? translations.vi.maxProjectsAlert : translations.en.maxProjectsAlert,
        onConfirm: () => {}
      });
      return;
    }
    setNewProjName(`Game ${projects.length + 1}`);
    setNewProjMode('quick');
    setShowCreateModal(true);
  };

  const handleConfirmCreateProject = () => {
    const trimmedName = newProjName.trim() || `Game ${projects.length + 1}`;
    
    let initialFiles: Record<string, string> | undefined = undefined;
    let initialCode = '<!-- Game code will appear here -->';
    
    if (newProjMode === 'full') {
      initialFiles = { ...defaultFullFiles };
      initialCode = getMergedHtml(initialFiles);
    }
    
    let additionalInst = getGlobalAdditionalSystemInstruction();
    if (newProjMode === 'full') {
      const fullModeReminder = "Hãy luôn luôn ưu tiên chia nhỏ dự án thành nhiều file riêng biệt (ví dụ: chia CSS, chia JS logic, chia dữ liệu thành các file components/utils khác nhau). Hãy tạo và quản lý càng nhiều file chuyên biệt càng tốt để mã nguồn sạch sẽ, không gộp tất cả vào một file index.html! Remember: split code into multiple files, create as many files as possible! Also, we use a Read-On-Demand workflow to save tokens. Only readme.md and metadata.json are loaded by default. To read any other file, you MUST write [!readfile:path_to_file] first!";
      additionalInst = additionalInst ? `${additionalInst}\n\n${fullModeReminder}` : fullModeReminder;
    }

    const newProject: Project = { 
      id: generateId(), 
      name: trimmedName,
      messages: [
        { 
          role: 'model', 
          text: newProjMode === 'full' 
            ? 'Chào mừng bạn đến với AI Game Studio (Bản đầy đủ)! Hệ thống file virtual đã được khởi tạo. Hãy mô tả trò chơi của bạn, hệ thống sẽ tự động thêm/sửa/xóa các file tương ứng.' 
            : 'Welcome to AI Studio. Describe the HTML game you want to build!', 
          codeSnapshot: initialCode,
          filesSnapshot: initialFiles ? { ...initialFiles } : undefined
        }
      ],
      code: initialCode,
      systemInstruction: getGlobalSystemInstruction(),
      themePrompt: getGlobalThemeInstruction(),
      additionalSystemInstruction: additionalInst,
      customModel: getGlobalCustomModel(),
      lastUsedAt: Date.now(),
      mode: newProjMode,
      files: initialFiles
    };
    
    setProjects(prev => [...prev, newProject]);
    setCurrentId(newProject.id);
    setShowCreateModal(false);
  };

  const handleDeleteProject = () => {
    if (safeMode) {
      if (deleteConfirmName !== currentProject.name) return;
    } else {
      if (!confirmDeleteChecked) return;
    }

    const remaining = projects.filter(p => p.id !== currentId);
    if (remaining.length === 0) {
      const fresh: Project = { 
        ...defaultProject, 
        id: generateId(),
        systemInstruction: getGlobalSystemInstruction(),
        themePrompt: getGlobalThemeInstruction(),
        additionalSystemInstruction: getGlobalAdditionalSystemInstruction(),
        customModel: getGlobalCustomModel(),
        lastUsedAt: Date.now()
      };
      setProjects([fresh]);
      setCurrentId(fresh.id);
    } else {
      setProjects(remaining);
      setCurrentId(remaining[0].id);
    }
    setShowDeleteModal(false);
    setDeleteConfirmName('');
    setConfirmDeleteChecked(false);
  };

  return (
    <div className={`flex h-screen w-full transition-colors ${theme === 'dark' ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-900'} overflow-hidden`}>
      {/* LEFT SIDEBAR: Chat & Settings */}
      <div className={`w-80 md:w-96 flex flex-col border-r z-10 shadow-sm transition-all flex-shrink-0 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        
        {/* Header & Projects */}
        <div className={`p-4 border-b flex flex-col gap-3 ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50/50 border-slate-200'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-indigo-500">
              <Sparkles className="w-5 h-5" />
              <h1 className="font-semibold tracking-tight">AI Game Studio</h1>
            </div>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setShowGuideModal(true)}
                title={lang === 'vi' ? 'Hướng dẫn sửa lỗi API' : 'API Error Guide'}
                className={`p-1.5 rounded-md hover:bg-indigo-500/10 text-slate-500 hover:text-indigo-500 transition-colors`}
              >
                <ShieldCheck className="w-4.5 h-4.5" />
              </button>
              <button 
                onClick={() => setShowTerminalModal(true)}
                title={lang === 'vi' ? 'Dòng lệnh hệ thống (Terminal/Tmux)' : 'System Terminal (Terminal/Tmux)'}
                className="p-1.5 rounded-md hover:bg-indigo-500/10 text-slate-500 hover:text-indigo-500 transition-colors font-mono font-bold text-xs"
              >
                &gt;_
              </button>
              <button 
                onClick={() => setShowAiParams(true)}
                title="AI Parameters"
                className={`p-1.5 rounded-md hover:bg-indigo-500/10 text-slate-500 hover:text-indigo-500 transition-colors`}
              >
                <Sliders className="w-4.5 h-4.5" />
              </button>
              <button 
                onClick={() => {
                  const projectId = currentProject.id;
                  let rulesList: InstructionRule[] = [];
                  try {
                    const saved = localStorage.getItem(`sys_rules_by_project_${projectId}`);
                    if (saved) {
                      rulesList = JSON.parse(saved);
                    } else {
                      const savedGlobal = localStorage.getItem('global_sys_rules');
                      if (savedGlobal) {
                        rulesList = JSON.parse(savedGlobal);
                      } else {
                        rulesList = DEFAULT_RULES.map(r => ({ ...r }));
                      }
                    }
                  } catch (e) {
                    rulesList = DEFAULT_RULES.map(r => ({ ...r }));
                  }
                  
                  // Migrate stale safeStorage rule automatically
                  rulesList = rulesList.map(r => {
                    if (r.id === 'safeStorage' && (!r.content.includes('test.data.safe'))) {
                      const defaultRule = DEFAULT_RULES.find(dr => dr.id === 'safeStorage');
                      if (defaultRule) {
                        return { ...defaultRule };
                      }
                    }
                    if (r.id === 'vfsTagRules' && (!r.content.includes('negative constraint'))) {
                      const defaultRule = DEFAULT_RULES.find(dr => dr.id === 'vfsTagRules');
                      if (defaultRule) {
                        return { ...defaultRule };
                      }
                    }
                    if (r.id === 'multiFile' && (!r.content.includes('split your code'))) {
                      const defaultRule = DEFAULT_RULES.find(dr => dr.id === 'multiFile');
                      if (defaultRule) {
                        return { ...defaultRule };
                      }
                    }
                    return r;
                  });

                  setSysRules(rulesList);
                  setShowSysInstructions(true);
                }}
                title={lang === 'vi' ? 'Chỉ thị hệ thống' : 'System Instructions'}
                className={`p-1.5 rounded-md hover:bg-indigo-500/10 text-slate-500 hover:text-indigo-500 transition-colors`}
              >
                <FileText className="w-4.5 h-4.5" />
              </button>
              <button 
                onClick={() => setShowSettings(true)}
                className={`p-1.5 rounded-md hover:bg-indigo-500/10 text-slate-500 hover:text-indigo-500 transition-colors`}
              >
                <Settings2 className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              {/* Trigger Button */}
              <button
                onClick={() => setProjectDropdownOpen(!projectDropdownOpen)}
                className={`w-full flex items-center justify-between text-sm p-1.5 pl-8 pr-3.5 rounded-md outline-none text-left border cursor-pointer select-none transition-colors ${
                  theme === 'dark' 
                    ? 'bg-slate-700 border-slate-600 text-white hover:bg-slate-600' 
                    : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
                }`}
              >
                <span className="truncate">{projects.find(p => p.id === currentId)?.name || 'Select project'}</span>
                <span className="text-[9px] text-slate-400">▼</span>
              </button>
              <Folder className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500 pointer-events-none" />

              {/* Custom Options List Dropdown Overlay */}
              {projectDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setProjectDropdownOpen(false)} />
                  <div className={`absolute left-0 right-0 mt-1 max-h-60 overflow-y-auto rounded-lg shadow-xl border z-20 py-1 ${
                    theme === 'dark' 
                      ? 'bg-slate-800 border-slate-700 text-white' 
                      : 'bg-white border-slate-200 text-slate-800'
                  }`}>
                    {projects.map(p => (
                      <div
                        key={p.id}
                        onClick={() => {
                          setCurrentId(p.id);
                          setProjectDropdownOpen(false);
                        }}
                        className={`px-3 py-2 text-xs font-medium cursor-pointer transition-colors ${
                          p.id === currentId
                            ? 'bg-indigo-600 text-white'
                            : (theme === 'dark' ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-50 text-slate-700')
                        }`}
                      >
                        {p.name}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
            <button onClick={handleCreateProject} title="New Project" className={`p-2 rounded-md transition-colors ${theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600' : 'bg-white border text-slate-600 hover:bg-slate-50 border-slate-200'}`}>
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Chat Messages */}
        <div ref={chatContainerRef} className="flex-1 overflow-y-auto w-full p-4 flex flex-col gap-4">
          {currentProject.messages.map((m, i) => (
            <div key={i} className={`flex flex-col w-full ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
              <span className={`text-[10px] uppercase font-bold tracking-wider mb-1 ${m.role === 'user' ? 'text-indigo-400' : 'text-slate-500'}`}>
                {m.role === 'user' ? 'You' : <>AI {m.duration !== undefined && <span className="ml-1 opacity-70">• {m.duration}s</span>}</>}
              </span>
              <div className={`p-3 rounded-2xl text-sm leading-relaxed max-w-[90%] break-words ${
                m.role === 'user' 
                  ? 'bg-indigo-600 text-white rounded-br-none' 
                  : (theme === 'dark' ? 'bg-slate-700 text-slate-100 rounded-bl-none' : 'bg-slate-100 text-slate-800 rounded-bl-none')
              }`}>
                {m.role === 'model' ? (
                  <ModelMessageContent 
                    text={m.text} 
                    theme={theme} 
                    lang={lang} 
                    CollapsibleCodeBlock={CollapsibleCodeBlock} 
                  />
                ) : (
                  <div className="markdown-body">
                    <Markdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        pre: ({ children }: any) => <>{children}</>,
                        code: (props: any) => <CollapsibleCodeBlock {...props} theme={theme} />
                      }}
                    >
                      {cleanThinkingText(m.text)}
                    </Markdown>
                  </div>
                )}
                {m.role === 'model' && <FileImpactWidget text={m.text} theme={theme} lang={lang} />}
                {m.attachments && m.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {m.attachments.map((a, idx) => (
                       <div key={idx} className={`text-[10px] px-2 py-1 rounded-md border flex items-center gap-1 ${
                         m.role === 'user' ? 'bg-indigo-700/50 border-indigo-500 text-indigo-100' : 'bg-slate-200 border-slate-300 text-slate-700'
                       }`}>
                          {a.dataUrl.startsWith('data:image') ? <ImageIcon className="w-3 h-3" /> : <Music className="w-3 h-3" />}
                          <span className="truncate max-w-[100px]">{a.name}</span>
                       </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex flex-col items-start w-full">
              <span className="text-[10px] uppercase font-bold tracking-wider mb-1 text-slate-500">
                AI <span className="ml-1 opacity-70"> • {loadingTime}s</span>
              </span>
              <div className={`p-3 text-sm rounded-2xl rounded-bl-none flex items-center gap-2 ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-100'}`}>
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  {isCurrentCodingRequest ? (
                    <>
                      <div className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs transition-opacity">{loadingStatus}</span>
                    </>
                  ) : (
                    <div className="flex items-center gap-1 py-1 px-0.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Info & Toolbar */}
        <div className={`px-4 py-2 flex items-center justify-between border-t text-xs ${theme === 'dark' ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-slate-50'}`}>
          <div className="text-emerald-500 font-medium truncate">
            {usedModelIndicator && `Model: ${usedModelIndicator}`}
          </div>
          {currentProject.messages.length > 2 && (
             <button 
                onClick={handleUndo} 
                disabled={isLoading}
                className={`flex items-center gap-1.5 font-medium hover:text-indigo-500 transition-colors disabled:opacity-50 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}
             >
               <Undo2 className="w-3.5 h-3.5" /> Undo
             </button>
          )}
        </div>

        {/* Chat Input */}
        <div className={`p-4 border-t flex flex-col gap-2 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>

          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 px-1">
               {attachments.map((a, i) => (
                  <div key={i} className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs border ${theme === 'dark' ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-slate-100 border-slate-200 text-slate-700'}`}>
                    {a.dataUrl.startsWith('data:image') ? <ImageIcon className="w-3 h-3 text-indigo-500" /> : <Music className="w-3 h-3 text-indigo-500" />}
                    <span className="truncate max-w-[120px]">{a.name}</span>
                    <button onClick={() => removeAttachment(i)} className="hover:text-red-500 ml-1"><X className="w-3 h-3" /></button>
                  </div>
               ))}
            </div>
          )}
          <div className="relative flex items-center w-full gap-2">
            <input 
               type="file" 
               ref={fileInputRef} 
               onChange={handleFileChange} 
               className="hidden" 
               multiple 
               accept="image/*,audio/*" 
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className={`p-2 rounded-lg transition-colors flex-shrink-0 ${theme === 'dark' ? 'text-slate-400 hover:bg-slate-700 hover:text-slate-200' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`}
              title="Attach File"
            >
              <Paperclip className="w-5 h-5" />
            </button>
            
            {/* INLINE AUTOCOMPLETE WRAPPER */}
            {(() => {
              const isProjectNew = currentProject.messages.length <= 1;
              let suggestionSuffix = "";
              let fullSuggestion = "";
              if (isProjectNew && input.trim() !== "") {
                const matched = SUGGESTIONS.find(s => s.toLowerCase().startsWith(input.toLowerCase()));
                if (matched) {
                  fullSuggestion = matched;
                  suggestionSuffix = matched.substring(input.length);
                }
              }

              return (
                <div className="relative flex-1 flex items-center">
                  <textarea
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Tab' && suggestionSuffix) {
                        e.preventDefault();
                        setInput(fullSuggestion);
                      }
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder={suggestionSuffix ? "" : "Tạo game bắn súng, khinh khí cầu..."}
                    className={`w-full pl-3 pr-10 py-3 rounded-xl text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-none max-h-32 border relative z-10 bg-transparent ${
                      theme === 'dark' ? 'border-slate-700 text-white bg-slate-900/40' : 'border-slate-200 text-slate-900 bg-white/40'
                    }`}
                    rows={2}
                  />
                  {suggestionSuffix && (
                    <div 
                      className="absolute inset-0 pl-3 pr-10 py-3 text-sm font-sans pointer-events-none select-none z-0 border border-transparent whitespace-pre flex overflow-hidden opacity-50 dark:opacity-40"
                    >
                      <span className="opacity-0">{input}</span>
                      <span className={`${theme === 'dark' ? 'text-slate-350' : 'text-slate-600'} italic`}>
                        {suggestionSuffix}
                        <span className="ml-1.5 px-1 py-0.5 text-[9px] font-semibold bg-slate-800 text-slate-200 rounded font-sans uppercase tracking-wider">Tab</span>
                      </span>
                    </div>
                  )}
                  {isLoading ? (
                    <button 
                      onClick={handleStop}
                      className="absolute right-2 p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors z-20"
                      title="Stop generation"
                    >
                      <Square className="w-4.5 h-4.5 fill-red-500 stroke-red-500" />
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleSend()}
                      disabled={!input.trim() && attachments.length === 0}
                      className="absolute right-2 p-1.5 rounded-lg text-indigo-500 hover:bg-indigo-500/10 disabled:opacity-50 disabled:hover:bg-transparent transition-colors z-20"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className={`flex-1 flex flex-col min-w-0 ${isFullscreen ? 'fixed inset-0 z-50' : ''} ${theme === 'dark' ? 'bg-slate-900' : 'bg-slate-100'}`}>
        
        {/* Tabs Bar */}
        <div className={`h-14 border-b flex items-center justify-between px-4 flex-shrink-0 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          <div className={`flex gap-1 p-1 rounded-lg ${theme === 'dark' ? 'bg-slate-900' : 'bg-slate-100'}`}>
            <button
              onClick={() => setActiveTab('code')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                activeTab === 'code' 
                  ? (theme === 'dark' ? 'bg-slate-800 text-indigo-400 shadow-sm' : 'bg-white shadow-sm text-indigo-600') 
                  : (theme === 'dark' ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')
              }`}
            >
              <Code2 className="w-4 h-4" /> Code
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                activeTab === 'preview' 
                ? (theme === 'dark' ? 'bg-slate-800 text-indigo-400 shadow-sm' : 'bg-white shadow-sm text-indigo-600') 
                : (theme === 'dark' ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')
              }`}
            >
              <Play className="w-4 h-4" /> Preview
            </button>
          </div>

          <div className="flex items-center gap-2">
            {currentProject.previousCode && currentProject.previousCode !== currentProject.code && (
              <button
                onClick={() => setShowChangesModal(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${theme === 'dark' ? 'text-emerald-400 hover:text-emerald-300 hover:bg-slate-700 bg-emerald-500/10' : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100 bg-emerald-50'}`}
                title="Xem thay đổi vị trí cũ và vị trí mới đã xóa, thêm, sửa"
              >
                <Eye className="w-4 h-4" /> Xem thay đổi (View Changes)
              </button>
            )}
            
            {activeTab === 'code' && (
              <button
                onClick={async () => {
                  const zip = new JSZip();
                  if (currentProject.files) {
                    Object.entries(currentProject.files).forEach(([path, content]) => {
                      zip.file(path, content);
                    });
                  } else {
                    zip.file('index.html', currentProject.code);
                  }
                  
                  const blob = await zip.generateAsync({ type: 'blob' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${currentProject.name.replace(/\s+/g, '-').toLowerCase()}.zip`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${theme === 'dark' ? 'text-slate-300 hover:text-indigo-400 hover:bg-slate-700' : 'text-slate-600 hover:text-indigo-600 hover:bg-indigo-50'}`}
              >
                <Download className="w-4 h-4" /> Download
              </button>
            )}
            {activeTab === 'preview' && (
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${theme === 'dark' ? 'text-slate-300 hover:text-indigo-400 hover:bg-slate-700' : 'text-slate-600 hover:text-indigo-600 hover:bg-indigo-50'}`}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />} 
              </button>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden relative">
          {activeTab === 'code' ? (
            <div className="flex w-full h-full overflow-hidden">
              {currentProject.mode === 'full' && renderFileTree()}
              <div className="flex-1 flex flex-col h-full min-w-0">
                <div className={`px-4 py-2 text-xs font-mono border-b flex items-center justify-between ${
                  theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}>
                  <span className="flex items-center gap-1.5">
                    <File className="w-3.5 h-3.5 text-indigo-500" />
                    {currentProject.mode === 'full' ? (
                      <>Đang sửa: <strong className="text-indigo-500 font-semibold">{selectedFilePath}</strong></>
                    ) : (
                      <>Đang sửa: <strong className="text-indigo-500 font-semibold">index.html</strong></>
                    )}
                  </span>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleOpenAnnotation}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wider transition-all border ${
                        theme === 'dark' 
                          ? 'border-indigo-500/30 bg-indigo-500/15 hover:bg-indigo-500/30 text-indigo-400' 
                          : 'border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-600'
                      }`}
                      title={lang === 'vi' ? 'Sửa nhanh đoạn code bôi đen' : 'Quick edit selected code'}
                    >
                      <PenTool className="w-3.5 h-3.5 animate-pulse text-indigo-500" />
                      <span>{lang === 'vi' ? 'Cây bút sửa nhanh' : 'Pen Tool'}</span>
                    </button>
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest">
                      {currentProject.mode === 'full' ? selectedFilePath.split('.').pop() || 'text' : 'html'}
                    </span>
                  </div>
                </div>

                {annotation && (
                  <div className={`p-4 border-b flex flex-col gap-3 animate-fade-in ${
                    theme === 'dark' ? 'bg-slate-900 border-indigo-500/20' : 'bg-indigo-50/40 border-indigo-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-indigo-500 font-semibold text-xs uppercase tracking-wider">
                        <PenTool className="w-4 h-4" />
                        <span>{lang === 'vi' ? 'Sửa Code Vùng Đã Chọn (Code Annotation)' : 'Code Annotation'}</span>
                      </div>
                      <button 
                        onClick={() => setAnnotation(null)}
                        className="text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">{lang === 'vi' ? 'Đoạn code đã quét chọn:' : 'Selected code block:'}</span>
                        <div className={`p-2.5 rounded-lg border overflow-auto max-h-32 font-mono text-[11px] leading-relaxed ${
                          theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
                        }`}>
                          <pre className="whitespace-pre-wrap break-all">{annotation.selectedText}</pre>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5 justify-between">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 uppercase">{lang === 'vi' ? 'Yêu cầu thay đổi cho vùng này:' : 'Modifications request for this block:'}</span>
                          <input
                            type="text"
                            value={annotationInput}
                            onChange={(e) => setAnnotationInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleSendAnnotation();
                              }
                            }}
                            className={`text-xs p-2.5 rounded-lg border outline-none focus:ring-1 focus:border-indigo-500 focus:ring-indigo-500 transition-shadow ${
                              theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'
                            }`}
                            placeholder={lang === 'vi' ? 'Ví dụ: Sửa nút này thành màu đỏ lấp lánh...' : 'e.g., Change this button to glowing red...'}
                            autoFocus
                          />
                        </div>
                        <div className="flex justify-end gap-2 mt-2">
                          <button
                            onClick={() => setAnnotation(null)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              theme === 'dark' ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-600'
                            }`}
                          >
                            {lang === 'vi' ? 'Hủy' : 'Cancel'}
                          </button>
                          <button
                            onClick={handleSendAnnotation}
                            disabled={!annotationInput.trim()}
                            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold uppercase tracking-wider transition-all shadow flex items-center gap-1.5"
                          >
                            <Send className="w-3 h-3" /> {lang === 'vi' ? 'Gửi yêu cầu' : 'Send'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <textarea
                  ref={textareaRef}
                  className={`w-full flex-1 p-6 text-sm font-mono outline-none resize-none ${theme === 'dark' ? 'bg-slate-950 text-slate-300' : 'bg-white text-slate-900'}`}
                  value={currentProject.mode === 'full' ? (currentProject.files?.[selectedFilePath] || '') : currentProject.code}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  spellCheck={false}
                />
              </div>
            </div>
          ) : (
            <div className={`w-full h-full flex flex-col p-2 md:p-6 ${theme === 'dark' ? 'bg-slate-900' : 'bg-slate-100'}`}>
              <div className={`flex-1 rounded-lg md:rounded-xl overflow-hidden shadow-sm border ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                {themesLoading || themesData ? (
                  <div className={`w-full h-full flex flex-col p-4 overflow-y-auto select-none transition-colors ${
                    theme === 'dark' ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-800'
                  }`}>
                    <div className={`flex items-center justify-between mb-4 border-b pb-2 flex-shrink-0 ${
                      theme === 'dark' ? 'border-slate-800' : 'border-slate-200'
                    }`}>
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-indigo-400 animate-spin" style={{ animationDuration: '3s' }} />
                        <div>
                          <h2 className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>AI Quick Themes Concept Art</h2>
                          <p className={`text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Chọn 1 mẫu thiết kế nhanh bằng API phụ để áp dụng sau khi chính sinh xong!</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => { setThemesData(null); setThemesLoading(false); }}
                        className={`p-1 px-2.5 rounded text-[10px] font-medium transition-all ${
                          theme === 'dark' ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                        }`}
                      >
                        Bỏ qua (Skip)
                      </button>
                    </div>

                    {themesLoading && !themesData && (
                      <div className="flex-1 flex flex-col items-center justify-center gap-4 py-8">
                        <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                        <div className="text-center">
                          <p className={`text-xs font-medium animate-pulse ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                            {lang === 'vi' ? 'Đang phác họa giao diện mẫu bằng API phụ...' : 'Drafting layout concepts via secondary API...'}
                          </p>
                          <p className="text-[10px] text-slate-500 mt-0.5">Neon • Clean • Light • Dark</p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 w-full max-w-md mt-4">
                          {['Neon Cyberpunk style', 'Clean Minimalist board', 'Modern Light accents', 'Sleek dark HUD'].map((t, idx) => (
                            <div key={idx} className={`h-20 rounded-lg border animate-pulse flex flex-col p-2.5 justify-between ${
                              theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                            }`}>
                              <div className={`h-2.5 rounded-full w-2/3 ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`} />
                              <div className="space-y-1">
                                <div className={`h-1.5 rounded-full w-full ${theme === 'dark' ? 'bg-slate-750' : 'bg-slate-50'}`} />
                                <div className={`h-1.5 rounded-full w-4/5 ${theme === 'dark' ? 'bg-slate-750' : 'bg-slate-50'}`} />
                              </div>
                              <span className={`text-[8px] uppercase font-bold tracking-widest ${theme === 'dark' ? 'text-slate-600' : 'text-slate-400'}`}>{t}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {themesData && (
                      <div className="grid grid-cols-2 gap-3 flex-1 overflow-y-auto pr-1">
                        {(['Neon', 'Clean', 'Light', 'Dark'] as const).map((styleKey) => {
                          const markup = themesData[styleKey];
                          const isSelected = selectedTheme === styleKey;
                          
                          return (
                            <div 
                              key={styleKey} 
                              onClick={() => selectAndApplyTheme(styleKey)}
                              className={`group flex flex-col rounded-lg overflow-hidden border cursor-pointer transition-all duration-300 hover:shadow-md relative h-48 ${
                                theme === 'dark'
                                  ? (isSelected 
                                      ? 'border-indigo-500 ring-2 ring-indigo-500/40 bg-slate-900 text-white' 
                                      : 'border-slate-800 hover:border-indigo-500/40 bg-slate-900/60 hover:bg-slate-900 text-slate-200')
                                  : (isSelected 
                                      ? 'border-indigo-500 ring-2 ring-indigo-500/40 bg-indigo-50/50 text-slate-900' 
                                      : 'border-slate-200 hover:border-indigo-500/40 bg-white hover:bg-slate-50/50 text-slate-700')
                              }`}
                            >
                              <div className={`flex items-center justify-between px-2 py-1 border-b flex-shrink-0 ${
                                theme === 'dark' ? 'bg-slate-950 border-slate-900' : 'bg-slate-100 border-slate-200 text-slate-700'
                              }`}>
                                <span className={`text-[10px] font-bold tracking-wider flex items-center gap-1 ${
                                  styleKey === 'Neon' ? 'text-pink-400' :
                                  styleKey === 'Clean' ? (theme === 'dark' ? 'text-slate-300' : 'text-slate-600') :
                                  styleKey === 'Light' ? 'text-amber-500' : 'text-blue-500'
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${
                                    styleKey === 'Neon' ? 'bg-pink-400' :
                                    styleKey === 'Clean' ? (theme === 'dark' ? 'bg-white' : 'bg-slate-400') :
                                    styleKey === 'Light' ? 'bg-amber-400' : 'bg-blue-400'
                                  }`} />
                                  {styleKey} Layout
                                </span>
                                <span className={`text-[8px] font-medium transition-all ${theme === 'dark' ? 'text-slate-500 group-hover:text-slate-300' : 'text-slate-400 group-hover:text-slate-600'}`}>
                                  {isSelected ? 'Đang áp dụng...' : 'Chọn Thể Loại'}
                                </span>
                              </div>
                              
                              <div className="flex-1 overflow-hidden relative pointer-events-none min-h-[140px]">
                                {markup ? (
                                  <div className="absolute top-0 left-0 w-[200%] h-[200%] origin-top-left scale-[0.5] overflow-hidden">
                                    <iframe
                                      title={`${styleKey} Preview`}
                                      className="w-full h-full border-0 bg-transparent overflow-hidden"
                                      srcDoc={markup}
                                      scrolling="no"
                                    />
                                  </div>
                                ) : (
                                  <div className={`w-full h-full ${theme === 'dark' ? 'bg-slate-900' : 'bg-slate-100'}`} />
                                )}
                                
                                <div className={`absolute inset-0 transition-colors flex items-center justify-center ${
                                  theme === 'dark' ? 'bg-slate-950/40 group-hover:bg-indigo-950/40' : 'bg-white/40 group-hover:bg-indigo-50/40'
                                }`}>
                                  <span className={`px-2 py-1.5 border font-semibold rounded shadow-sm flex items-center gap-1.5 transition-all ${
                                    theme === 'dark'
                                      ? 'bg-slate-900/90 border-slate-700/60 group-hover:border-indigo-500 text-slate-200 group-hover:text-white'
                                      : 'bg-white/95 border-slate-200 group-hover:border-indigo-500 text-slate-700 group-hover:text-indigo-600'
                                  }`}>
                                     <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-pulse" /> Apply '{styleKey}'
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-full h-full overflow-auto bg-white" id="preview-scroll-wrapper">
                    <iframe
                      title="Game Preview"
                      className="w-full h-full border-0 bg-white block"
                      srcDoc={getInjectedCode(currentProject.code)}
                      sandbox="allow-scripts allow-modals"
                      scrolling="yes"
                      style={{ overflow: 'auto', WebkitOverflowScrolling: 'touch' }}
                    />
                  </div>
                )}
              </div>

              {/* Console log drawer */}
              {!isFullscreen && (
                <div className={`mt-3 rounded-lg border flex flex-col transition-all overflow-hidden ${
                  showLogsPanel ? 'h-48' : 'h-10'
                } ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                  {/* Header */}
                  <div 
                    onClick={() => setShowLogsPanel(!showLogsPanel)}
                    className={`flex items-center justify-between px-3 h-10 border-b cursor-pointer select-none ${theme === 'dark' ? 'border-slate-700 bg-slate-900/40 text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-700'}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs uppercase tracking-wider">Console Log</span>
                      {logs.length > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-indigo-500 text-white font-bold leading-none">
                          {logs.length}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {showLogsPanel && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); setLogs([]); }}
                          className="text-[10px] text-slate-400 hover:text-red-500 font-medium px-2 py-0.5 rounded hover:bg-slate-500/10 transition-all font-sans"
                        >
                          Clear
                        </button>
                      )}
                      <span className="text-xs font-mono font-bold text-slate-400">
                        {showLogsPanel ? '▼' : '▲'}
                      </span>
                    </div>
                  </div>

                  {/* Logs list */}
                  {showLogsPanel && (
                    <div className={`flex-1 overflow-y-auto p-3 font-mono text-[11px] flex flex-col gap-1 transition-colors ${
                      theme === 'dark' ? 'bg-slate-950 text-slate-200' : 'bg-slate-50 text-slate-700 border-t border-slate-100'
                    }`}>
                      {lastError && (
                        <div className={`p-2 rounded-lg border flex items-center justify-between text-xs mb-2 flex-shrink-0 animate-pulse ${
                          theme === 'dark' ? 'bg-red-950/40 border-red-850 text-red-300' : 'bg-red-50 border-red-200 text-red-700'
                        }`}>
                          <div className="flex items-center gap-1.5 truncate pr-2">
                            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 animate-bounce" />
                            <span className="truncate font-semibold">[Error] {lastError}</span>
                          </div>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              const fixPrompt = `Đang chạy game thì gặp lỗi sau trong console log: "${lastError}". Hãy sửa lỗi này và cập nhật lại file code HTML hoàn chỉnh.`;
                              handleSend(fixPrompt);
                            }}
                            className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white font-bold rounded text-[10px] transition-all flex-shrink-0 shadow-sm cursor-pointer"
                          >
                            Sửa lỗi (Fix)
                          </button>
                        </div>
                      )}

                      {logs.length === 0 ? (
                        <div className="text-slate-500 italic text-center py-4">Chưa có bản ghi nào. Hãy chạy game hoặc tạo lỗi để xem log!</div>
                      ) : (
                        logs.map((log, index) => {
                          let color = theme === 'dark' ? 'text-slate-200' : 'text-slate-700';
                          if (log.type === 'error') {
                            color = theme === 'dark'
                              ? 'text-red-400 font-semibold bg-red-950/20 px-1.5 py-0.5 border-l-2 border-red-500 rounded-sm'
                              : 'text-red-600 font-semibold bg-red-50 px-1.5 py-0.5 border-l-2 border-red-500 rounded-sm';
                          }
                          if (log.type === 'warn') {
                            color = theme === 'dark'
                              ? 'text-amber-400 bg-amber-950/20 px-1.5 py-0.5 border-l-2 border-amber-500 rounded-sm'
                              : 'text-amber-600 font-semibold bg-amber-50 px-1.5 py-0.5 border-l-2 border-amber-500 rounded-sm';
                          }
                          return (
                            <div 
                              key={index} 
                              className={`flex gap-2 items-start rounded px-1 py-0.5 transition-colors ${
                                theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-slate-800/5'
                              } ${color}`}
                            >
                              <span className="text-slate-500 select-none">[{log.timestamp}]</span>
                              <span className="break-all whitespace-pre-wrap">{log.message}</span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className={`w-full max-w-md rounded-2xl shadow-xl flex flex-col overflow-hidden ${theme === 'dark' ? 'bg-slate-800 border border-slate-700' : 'bg-white'}`}>
            <div className={`p-4 border-b flex items-center justify-between ${theme === 'dark' ? 'border-slate-700 bg-slate-800' : 'border-slate-100 bg-slate-50/50'}`}>
              <h2 className="font-semibold flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-indigo-500" />
                {translations[lang].settings}
              </h2>
              <button onClick={() => setShowSettings(false)} className={`p-1 rounded-md transition-colors ${theme === 'dark' ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}><X className="w-5 h-5" /></button>
            </div>
            
            <div className="p-5 flex flex-col gap-5 overflow-y-auto max-h-[70vh]">
              {/* Language Selection */}
              <div>
                <label className="text-sm font-medium mb-1.5 block text-indigo-500">{translations[lang].languageSelection}</label>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => setLang('vi')}
                    className={`p-2 rounded-lg text-xs font-semibold border transition-all ${lang === 'vi' ? 'bg-indigo-500 text-white border-indigo-500 shadow-sm' : (theme === 'dark' ? 'bg-slate-900 hover:bg-slate-700 border-slate-700 text-slate-300' : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700')}`}
                  >
                    Tiếng Việt
                  </button>
                  <button 
                    onClick={() => setLang('en')}
                    className={`p-2 rounded-lg text-xs font-semibold border transition-all ${lang === 'en' ? 'bg-indigo-500 text-white border-indigo-500 shadow-sm' : (theme === 'dark' ? 'bg-slate-900 hover:bg-slate-700 border-slate-700 text-slate-300' : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700')}`}
                  >
                    English
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">{translations[lang].projectName}</label>
                <input 
                  type="text"
                  value={currentProject.name}
                  onChange={e => updateProject({ name: e.target.value })}
                  className={`w-full text-sm p-2.5 rounded-lg border outline-none focus:ring-1 focus:border-indigo-500 focus:ring-indigo-500 transition-shadow ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200'}`}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">{translations[lang].darkMode}</label>
                <button 
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className={`w-full flex items-center justify-center gap-2 text-sm p-2.5 rounded-lg border transition-colors ${theme === 'dark' ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/50 hover:bg-indigo-500/30' : 'bg-slate-50 text-slate-70 border-slate-200 hover:bg-slate-100'}`}
                >
                  {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                  {theme === 'dark' ? translations[lang].darkModeOn : translations[lang].lightModeOn}
                </button>
              </div>

              {/* Safe Mode config section */}
              <div className="border border-indigo-500/15 rounded-xl p-3 bg-indigo-500/5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-indigo-500 uppercase tracking-wide">{translations[lang].safetyMode}</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={safeMode}
                      onChange={(e) => setSafeMode(e.target.checked)}
                    />
                    <div className="w-9 h-5 bg-slate-200 dark:bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-500"></div>
                  </label>
                </div>
                <p className={`text-[11px] leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  {safeMode ? translations[lang].safetyEnabledTip : translations[lang].safetyDisabledTip}
                </p>
                <div className="mt-2 text-[10px] font-semibold text-indigo-400 flex justify-between">
                  <span>{translations[lang].projectsCountLabel} {projects.length} / {safeMode ? 3 : 10}</span>
                  <span>Auto-cleanup active (30 days)</span>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block text-indigo-500">{translations[lang].systemInstructions}</label>
                <textarea 
                  value={currentProject.additionalSystemInstruction || ""}
                  onChange={e => {
                    const val = e.target.value;
                    updateProject({ additionalSystemInstruction: val });
                    try {
                      localStorage.setItem('global_additional_system_instruction', val);
                    } catch (err) {}
                  }}
                  placeholder="e.g. Always use Tailwind..."
                  className={`w-full text-sm p-2.5 rounded-lg border outline-none focus:ring-1 focus:border-indigo-500 focus:ring-indigo-500 transition-shadow resize-y min-h-[80px] ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200'}`}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block text-indigo-500 font-semibold flex items-center gap-1">
                  <span>{translations[lang].primaryKey}</span>
                </label>
                <input 
                  type="password"
                  value={apiKeyPrimary}
                  onChange={e => setApiKeyPrimary(e.target.value)}
                  placeholder={translations[lang].primaryPlaceholder}
                  className={`w-full text-sm p-2.5 rounded-lg border outline-none focus:ring-1 focus:border-indigo-500 focus:ring-indigo-500 transition-shadow ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200'}`}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block text-emerald-500 font-semibold flex items-center gap-1">
                  <span>{translations[lang].secondaryKey}</span>
                </label>
                <input 
                  type="password"
                  value={apiKeySecondary}
                  onChange={e => setApiKeySecondary(e.target.value)}
                  placeholder={translations[lang].secondaryPlaceholder}
                  className={`w-full text-sm p-2.5 rounded-lg border outline-none focus:ring-1 focus:border-indigo-500 focus:ring-indigo-500 transition-shadow ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200'}`}
                />
              </div>

               {/* Model selection dropdown & Add custom model */}
              <div className="border bg-slate-500/5 border-slate-500/10 rounded-xl p-3 flex flex-col gap-3">
                <div>
                  <label className="text-xs font-semibold mb-1.5 block text-indigo-500 uppercase tracking-wider">{translations[lang].modelSelection}</label>
                  <div className="relative">
                    {/* Trigger Button */}
                    <button
                      onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
                      type="button"
                      className={`w-full flex items-center justify-between text-sm p-2.5 rounded-lg outline-none text-left border cursor-pointer select-none transition-colors ${
                        theme === 'dark' 
                          ? 'bg-slate-900 border-slate-700 text-white hover:bg-slate-800' 
                          : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
                      }`}
                    >
                      <span>{(() => {
                        if (!currentProject.customModel) return `-- ${translations[lang].selectModel} --`;
                        const parts = currentProject.customModel.split(':');
                        return parts.length > 1 ? parts.slice(1).join(':') : parts[0];
                      })()}</span>
                      <span className="text-[9px] text-slate-400">▼</span>
                    </button>

                    {/* Custom Options List Dropdown Overlay */}
                    {modelDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setModelDropdownOpen(false)} />
                        <div className={`absolute left-0 right-0 mt-1 max-h-52 overflow-y-auto rounded-lg shadow-xl border z-20 py-1 ${
                          theme === 'dark' 
                            ? 'bg-slate-800 border-slate-700 text-white' 
                            : 'bg-white border-slate-200 text-slate-800'
                        }`}>
                          <div
                            onClick={() => {
                              updateProject({ customModel: '' });
                              try {
                                  localStorage.setItem('global_custom_model', '');
                              } catch (err) {}
                              setModelDropdownOpen(false);
                            }}
                            className={`px-3 py-2 text-xs font-medium cursor-pointer transition-colors ${
                              currentProject.customModel === ''
                                ? 'bg-indigo-600 text-white'
                                : (theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-50 text-slate-500')
                            }`}
                          >
                            -- {translations[lang].selectModel} --
                          </div>
                          {customModelsList.map(mod => {
                            const p = providers.find(prov => prov.id === mod.providerId);
                            const providerLabel = p ? p.name : 'Unknown';
                            const modelKey = `${mod.providerId}:${mod.name}`;
                            const isSelected = currentProject.customModel === modelKey || currentProject.customModel === mod.name;
                            return (
                              <div
                                key={modelKey}
                                onClick={() => {
                                  updateProject({ customModel: modelKey });
                                  try {
                                    localStorage.setItem('global_custom_model', modelKey);
                                  } catch (err) {}
                                  setModelDropdownOpen(false);
                                }}
                                className={`px-3 py-2 text-xs font-medium cursor-pointer transition-colors flex justify-between items-center gap-2 ${
                                  isSelected
                                    ? 'bg-indigo-600 text-white'
                                    : (theme === 'dark' ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-50 text-slate-700')
                                }`}
                              >
                                <div className="flex items-center gap-1.5 truncate">
                                  <span className="truncate">{mod.name}</span>
                                  {mod.taskType && (
                                    <span className={`text-[8px] px-1 py-0.1 rounded uppercase font-mono font-bold ${
                                      isSelected
                                        ? 'bg-indigo-700 text-white border border-indigo-500'
                                        : (theme === 'dark' ? 'bg-indigo-950 text-indigo-400 border border-indigo-900' : 'bg-indigo-50 text-indigo-600 border border-indigo-100')
                                    }`}>
                                      {mod.taskType}
                                    </span>
                                  )}
                                </div>
                                <span className={`text-[9px] px-1.5 py-0.5 rounded flex-shrink-0 ${
                                  isSelected 
                                    ? 'bg-indigo-500 text-white' 
                                    : (theme === 'dark' ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500')
                                }`}>
                                  {providerLabel}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2 border-t border-slate-500/10 pt-2.5">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-slate-400 font-medium">{translations[lang].selectProviderLabel}</span>
                    <div className="relative">
                      <button
                        onClick={() => setSelectedProviderDropdownOpen(!selectedProviderDropdownOpen)}
                        type="button"
                        className={`w-full flex items-center justify-between text-xs p-2 rounded-lg outline-none text-left border cursor-pointer select-none transition-colors ${
                          theme === 'dark' 
                            ? 'bg-slate-900 border-slate-700 text-white hover:bg-slate-800' 
                            : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
                        }`}
                      >
                        <span>{providers.find(p => p.id === selectedProviderIdForNewModel)?.name || 'Select provider'}</span>
                        <span className="text-[8px] text-slate-400">▼</span>
                      </button>

                      {selectedProviderDropdownOpen && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setSelectedProviderDropdownOpen(false)} />
                          <div className={`absolute left-0 right-0 mt-1 max-h-40 overflow-y-auto rounded-lg shadow-xl border z-20 py-1 ${
                            theme === 'dark' 
                              ? 'bg-slate-800 border-slate-700 text-white' 
                              : 'bg-white border-slate-200 text-slate-800'
                          }`}>
                            {providers.map(p => {
                              const isSelected = selectedProviderIdForNewModel === p.id;
                              return (
                                <div
                                  key={p.id}
                                  onClick={() => {
                                    setSelectedProviderIdForNewModel(p.id);
                                    setSelectedProviderDropdownOpen(false);
                                  }}
                                  className={`px-3 py-2 text-xs font-medium cursor-pointer transition-colors ${
                                    isSelected
                                      ? 'bg-indigo-600 text-white'
                                      : (theme === 'dark' ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-50 text-slate-700')
                                  }`}
                                >
                                  {p.name}
                                </div>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-slate-400 font-medium">
                      {lang === 'vi' ? 'Phân loại / Nhiệm vụ Model (Task Type):' : 'Model Task Type / Capability:'}
                    </span>
                    <select
                      value={newModelTaskType}
                      onChange={e => setNewModelTaskType(e.target.value)}
                      className={`w-full text-xs p-2 rounded-lg border outline-none focus:ring-1 focus:border-indigo-500 focus:ring-indigo-500 transition-shadow ${
                        theme === 'dark' 
                          ? 'bg-slate-900 border-slate-700 text-white' 
                          : 'bg-white border-slate-200 text-slate-800'
                      }`}
                    >
                      {MODEL_TASK_TYPES.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-slate-400 font-medium">{translations[lang].modelNameLabel}</span>
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        value={newModelInput}
                        onChange={e => setNewModelInput(e.target.value)}
                        placeholder={translations[lang].addModelPlaceholder}
                        className={`flex-1 text-xs p-2 rounded-lg border outline-none focus:ring-1 focus:border-indigo-500 focus:ring-indigo-500 transition-shadow ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200'}`}
                      />
                      <button
                        onClick={handleAddNewModel}
                        className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors border border-indigo-700/20 shadow-sm flex-shrink-0"
                      >
                        {translations[lang].addModelBtn}
                      </button>
                    </div>
                    {modelError && (
                      <span className="text-[10px] text-red-500 font-semibold mt-0.5">{modelError}</span>
                    )}
                  </div>

                  {/* List of Models for Deletion */}
                  <div className="flex flex-col gap-1 border-t border-slate-500/10 pt-2.5">
                    <span className="text-[10px] text-slate-400 font-medium">
                      {lang === 'vi' ? 'Danh sách Model hiện tại:' : 'Current Model List:'}
                    </span>
                    <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto pr-1">
                      {customModelsList.map(mod => {
                        const p = providers.find(prov => prov.id === mod.providerId);
                        const providerLabel = p ? p.name : 'Unknown';
                        return (
                          <div
                            key={`${mod.name}-${mod.providerId}`}
                            className={`flex items-center justify-between p-2 rounded-lg border text-xs ${
                              theme === 'dark' ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate pr-2 flex-wrap">
                              <span className="font-semibold truncate">{mod.name}</span>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                                theme === 'dark' ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'
                              }`}>
                                {providerLabel}
                              </span>
                              {mod.taskType && (
                                <span className={`text-[8px] px-1.5 py-0.2 rounded border uppercase font-mono font-bold ${
                                  theme === 'dark' ? 'bg-indigo-950/40 border-indigo-900/40 text-indigo-400' : 'bg-indigo-50 border-indigo-100 text-indigo-600'
                                }`}>
                                  {mod.taskType}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <button
                                onClick={() => {
                                  const isCurrentSecondary = secondaryModel?.name === mod.name && secondaryModel?.providerId === mod.providerId;
                                  if (isCurrentSecondary) {
                                    setSecondaryModel(null);
                                  } else {
                                    setSecondaryModel(mod);
                                  }
                                }}
                                className={`text-[10px] font-semibold px-2 py-1 rounded transition-all flex items-center gap-1 cursor-pointer ${
                                  secondaryModel?.name === mod.name && secondaryModel?.providerId === mod.providerId
                                    ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30'
                                    : 'text-slate-400 hover:text-slate-350 hover:bg-slate-500/10 border border-transparent'
                                }`}
                                title={lang === 'vi' ? 'Bật làm API phụ cho sinh giao diện' : 'Set as secondary API for UI generation'}
                              >
                                <Sparkles className="w-3 h-3" />
                                <span>{lang === 'vi' ? 'Làm phụ' : 'Sec'}</span>
                              </button>
                              <button
                                onClick={() => handleDeleteModel(mod)}
                                className="text-[10px] text-red-500 hover:text-red-600 font-semibold px-2 py-1 rounded hover:bg-red-500/10 transition-colors cursor-pointer"
                              >
                                {translations[lang].deleteProviderBtn}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* API Providers Section */}
              <div className="border bg-slate-500/5 border-slate-500/10 rounded-xl p-3 flex flex-col gap-3">
                <label className="text-xs font-semibold block text-indigo-500 uppercase tracking-wider">{translations[lang].providersTitle}</label>
                <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-1">
                  {providers.map(p => (
                    <div 
                      key={p.id} 
                      className={`flex items-center justify-between p-2 rounded-lg border text-xs ${
                        theme === 'dark' ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <div className="truncate pr-2">
                        <span className="font-semibold block">{p.name}</span>
                        <span className="text-[10px] text-slate-400 block truncate">{p.baseUrl}</span>
                      </div>
                      {p.id !== 'gemini' && (
                        <button 
                          onClick={() => handleDeleteProvider(p.id)}
                          className="text-[10px] text-red-500 hover:text-red-600 font-semibold px-2 py-1 rounded hover:bg-red-500/10 transition-colors"
                        >
                          {translations[lang].deleteProviderBtn}
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="border-t border-slate-500/10 pt-3 flex flex-col gap-2.5">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-slate-400 font-medium">{translations[lang].providerName}</span>
                      <input 
                        type="text"
                        value={newProviderName}
                        onChange={e => setNewProviderName(e.target.value)}
                        placeholder="e.g. OpenRouter"
                        className={`text-xs p-2 rounded-lg border outline-none ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200'}`}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-slate-400 font-medium">{translations[lang].providerKey}</span>
                      <input 
                        type="password"
                        value={newProviderKey}
                        onChange={e => setNewProviderKey(e.target.value)}
                        placeholder="sk-or-..."
                        className={`text-xs p-2 rounded-lg border outline-none ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200'}`}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-slate-400 font-medium">{translations[lang].providerUrl}</span>
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        value={newProviderUrl}
                        onChange={e => setNewProviderUrl(e.target.value)}
                        placeholder="https://openrouter.ai/api/v1"
                        className={`flex-1 text-xs p-2 rounded-lg border outline-none ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200'}`}
                      />
                      <button
                        onClick={handleAddNewProvider}
                        className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm flex-shrink-0"
                      >
                        {translations[lang].addProviderBtn}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className={`pt-4 mt-2 border-t flex items-center justify-between ${theme === 'dark' ? 'border-slate-700' : 'border-slate-100'}`}>
                <span className="text-sm font-medium text-red-500">{translations[lang].dangerZone}</span>
                <button 
                  onClick={() => setShowDeleteModal(true)}
                  className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-red-500/10 text-red-600 rounded-md hover:bg-red-500/20 transition-colors font-medium border border-red-500/20"
                >
                  <Trash2 className="w-4 h-4" /> {translations[lang].deleteProject}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
           <div className={`w-full max-w-sm rounded-2xl shadow-xl flex flex-col p-6 gap-4 ${theme === 'dark' ? 'bg-slate-800 border border-slate-700 text-slate-100' : 'bg-white text-slate-800'}`}>
             <div className="flex items-start gap-3 text-red-500">
               <AlertCircle className="w-6 h-6 flex-shrink-0 mt-0.5" />
               <div>
                  <h3 className="font-semibold text-lg leading-tight">{translations[lang].confirmDeleteTitle}</h3>
                  <p className={`text-sm mt-1 mb-1.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                    {safeMode 
                      ? translations[lang].confirmDeleteDesc.replace('{name}', currentProject.name)
                      : translations[lang].confirmDeleteCheckboxDesc
                    }
                  </p>
               </div>
             </div>
             
             {safeMode ? (
               <input 
                  type="text"
                  autoFocus
                  value={deleteConfirmName}
                  onChange={e => setDeleteConfirmName(e.target.value)}
                  placeholder={translations[lang].projectName}
                  className={`w-full border rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-red-500/50 transition-shadow ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200'}`}
               />
             ) : (
               <label className="flex items-start gap-2.5 cursor-pointer select-none p-3 rounded-lg border border-red-500/20 bg-red-500/5">
                 <input 
                   type="checkbox" 
                   checked={confirmDeleteChecked}
                   onChange={(e) => setConfirmDeleteChecked(e.target.checked)}
                   className="w-4 h-4 mt-0.5 rounded border-rose-300 text-red-600 focus:ring-red-500"
                 />
                 <span className={`text-xs ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                   {translations[lang].confirmDeleteCheckboxDesc}
                 </span>
               </label>
             )}

             <div className="flex gap-2 justify-end mt-2">
               <button 
                 onClick={() => { setShowDeleteModal(false); setDeleteConfirmName(''); setConfirmDeleteChecked(false); }}
                 className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${theme === 'dark' ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}
               >
                 {translations[lang].cancel}
               </button>
               <button 
                 onClick={handleDeleteProject}
                 disabled={safeMode ? deleteConfirmName !== currentProject.name : !confirmDeleteChecked}
                 className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:hover:bg-red-600 transition-colors"
               >
                 {translations[lang].delete}
               </button>
             </div>
           </div>
        </div>
      )}

      {/* Model Delete Modal (under safeMode) */}
      {modelToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
           <div className={`w-full max-w-sm rounded-2xl shadow-xl flex flex-col p-6 gap-4 ${theme === 'dark' ? 'bg-slate-800 border border-slate-700 text-slate-100' : 'bg-white text-slate-800'}`}>
             <div className="flex items-start gap-3 text-red-500">
               <AlertCircle className="w-6 h-6 flex-shrink-0 mt-0.5" />
               <div>
                  <h3 className="font-semibold text-lg leading-tight">
                    {lang === 'vi' ? 'Xác nhận xóa Model?' : 'Confirm delete Model?'}
                  </h3>
                  <p className={`text-sm mt-1 mb-1.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                    {lang === 'vi' 
                      ? `Bạn đang chuẩn bị xóa model "${modelToDelete.name}".` 
                      : `You are about to delete model "${modelToDelete.name}".`}
                  </p>
               </div>
             </div>
             
             <label className="flex items-start gap-2.5 cursor-pointer select-none p-3 rounded-lg border border-red-500/20 bg-red-500/5">
               <input 
                 type="checkbox" 
                 checked={confirmDeleteModelChecked}
                 onChange={(e) => setConfirmDeleteModelChecked(e.target.checked)}
                 className="w-4 h-4 mt-0.5 rounded border-rose-300 text-red-600 focus:ring-red-500 cursor-pointer"
               />
               <span className={`text-xs ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                 {lang === 'vi' 
                   ? 'Tôi hoàn toàn xác nhận và đồng ý xóa vĩnh viễn model này.' 
                   : 'I fully confirm and agree to permanently delete this model.'}
               </span>
             </label>

             <div className="flex gap-2 justify-end mt-2">
               <button 
                 onClick={() => { setModelToDelete(null); setConfirmDeleteModelChecked(false); }}
                 className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${theme === 'dark' ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}
               >
                 {translations[lang].cancel}
               </button>
               <button 
                 onClick={() => {
                   confirmDeleteModelActual(modelToDelete);
                   setModelToDelete(null);
                   setConfirmDeleteModelChecked(false);
                 }}
                 disabled={!confirmDeleteModelChecked}
                 className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:hover:bg-red-600 transition-colors"
               >
                 {translations[lang].delete}
               </button>
             </div>
           </div>
        </div>
      )}

      {/* Provider Delete Modal (under safeMode) */}
      {providerToDeleteId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
           <div className={`w-full max-w-sm rounded-2xl shadow-xl flex flex-col p-6 gap-4 ${theme === 'dark' ? 'bg-slate-800 border border-slate-700 text-slate-100' : 'bg-white text-slate-800'}`}>
             <div className="flex items-start gap-3 text-red-500">
               <AlertCircle className="w-6 h-6 flex-shrink-0 mt-0.5" />
               <div>
                  <h3 className="font-semibold text-lg leading-tight">
                    {lang === 'vi' ? 'Xác nhận xóa bên cung cấp API?' : 'Confirm delete API Provider?'}
                  </h3>
                  <p className={`text-sm mt-1 mb-1.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                    {lang === 'vi' 
                      ? `Bạn đang chuẩn bị xóa bên cung cấp "${providers.find(p => p.id === providerToDeleteId)?.name || providerToDeleteId}". Mọi model liên quan cũng sẽ bị gỡ.` 
                      : `You are about to delete API provider "${providers.find(p => p.id === providerToDeleteId)?.name || providerToDeleteId}". All related models will also be removed.`}
                  </p>
               </div>
             </div>
             
             <label className="flex items-start gap-2.5 cursor-pointer select-none p-3 rounded-lg border border-red-500/20 bg-red-500/5">
               <input 
                 type="checkbox" 
                 checked={confirmDeleteProviderChecked}
                 onChange={(e) => setConfirmDeleteProviderChecked(e.target.checked)}
                 className="w-4 h-4 mt-0.5 rounded border-rose-300 text-red-600 focus:ring-red-500 cursor-pointer"
               />
               <span className={`text-xs ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                 {lang === 'vi' 
                   ? 'Tôi hoàn toàn xác nhận và đồng ý xóa bên cung cấp API này.' 
                   : 'I fully confirm and agree to permanently delete this API provider.'}
               </span>
             </label>

             <div className="flex gap-2 justify-end mt-2">
               <button 
                 onClick={() => { setProviderToDeleteId(null); setConfirmDeleteProviderChecked(false); }}
                 className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${theme === 'dark' ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}
               >
                 {translations[lang].cancel}
               </button>
               <button 
                 onClick={() => {
                   confirmDeleteProviderActual(providerToDeleteId);
                   setProviderToDeleteId(null);
                   setConfirmDeleteProviderChecked(false);
                 }}
                 disabled={!confirmDeleteProviderChecked}
                 className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:hover:bg-red-600 transition-colors"
               >
                 {translations[lang].delete}
               </button>
             </div>
           </div>
        </div>
      )}

      {/* Guide Modal */}
      {showGuideModal && (() => {
        const tr = GUIDE_TRANSLATIONS[lang === 'vi' ? 'vi' : 'en'];
        return (
          <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
            <div className={`w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden transition-all ${
              theme === 'dark' ? 'bg-slate-900 border border-slate-700 text-slate-100' : 'bg-white text-slate-800 border border-slate-200'
            }`}>
              {/* Header */}
              <div className={`p-4 border-b flex items-center justify-between sticky top-0 z-10 ${
                theme === 'dark' ? 'border-slate-800 bg-slate-900' : 'border-slate-100 bg-slate-50'
              }`}>
                <h2 className="font-bold flex items-center gap-2 text-base md:text-lg">
                  <ShieldCheck className="w-5.5 h-5.5 text-indigo-500 animate-pulse" />
                  <span>{tr.title}</span>
                </h2>
                <button 
                  onClick={() => setShowGuideModal(false)} 
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    theme === 'dark' ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-600'
                  }`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-5 space-y-6">
                <div className={`p-3 rounded-xl border text-xs leading-relaxed ${
                  theme === 'dark' ? 'bg-indigo-950/20 border-indigo-900/40 text-indigo-200' : 'bg-indigo-50/50 border-indigo-100 text-indigo-800'
                }`}>
                  <strong>{tr.noteTitle}</strong> {tr.noteDesc}
                </div>

                {/* List of Sections */}
                <div className="space-y-6">
                  {tr.sections.map((sec) => (
                    <div 
                      key={sec.id}
                      className={`p-4 rounded-xl border transition-all hover:shadow-sm ${
                        theme === 'dark' ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-50/50 border-slate-200/80'
                      }`}
                    >
                      <h3 className={`font-bold text-sm ${sec.color} flex items-center gap-2 mb-3.5 border-b pb-1.5 ${sec.borderColor}`}>
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center font-mono text-[10px] ${theme === 'dark' ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600'}`}>
                          {sec.id}
                        </span>
                        {sec.title}
                      </h3>
                      <div className="space-y-4 text-xs">
                        {sec.items.map((item, idx) => (
                          <div key={idx}>
                            <p className="font-bold text-slate-400 flex items-center gap-1.5">
                              <span className={`px-1.5 py-0.5 text-[9px] font-mono rounded ${sec.bgClass}`}>
                                {item.error.split('(')[1]?.replace(')', '') || 'Error'}
                              </span>
                              {item.error.split('(')[0].trim()}
                            </p>
                            <p className="mt-1 pl-1 text-slate-500 dark:text-slate-300">
                              {item.desc}
                            </p>
                            <p className="mt-1 pl-1 text-indigo-500 font-semibold">
                              {item.fix}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className={`p-4 border-t flex justify-end sticky bottom-0 z-10 ${
                theme === 'dark' ? 'border-slate-800 bg-slate-900' : 'border-slate-100 bg-slate-50'
              }`}>
                <button
                  onClick={() => setShowGuideModal(false)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm cursor-pointer"
                >
                  {tr.closeBtn}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* AI Parameters Modal */}
      {showAiParams && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className={`w-full max-w-md rounded-2xl shadow-xl flex flex-col overflow-hidden ${theme === 'dark' ? 'bg-slate-800 border border-slate-700 text-slate-100' : 'bg-white text-slate-800'}`}>
            {/* Header */}
            <div className={`p-4 border-b flex items-center justify-between ${theme === 'dark' ? 'border-slate-700 bg-slate-800' : 'border-slate-100 bg-slate-50/50'}`}>
              <h2 className="font-semibold flex items-center gap-2">
                <Sliders className="w-5 h-5 text-indigo-500" />
                <span>{lang === 'vi' ? 'Tham số API' : 'API Parameters'}</span>
              </h2>
              <button 
                onClick={() => setShowAiParams(false)} 
                className={`p-1.5 rounded-md transition-colors ${theme === 'dark' ? 'hover:bg-slate-700' : 'hover:bg-slate-100 text-slate-600'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className={`flex border-b ${theme === 'dark' ? 'border-slate-700 bg-slate-900/20' : 'border-slate-100 bg-slate-50/30'}`}>
              {(['primary', 'secondary'] as const).map(tab => {
                const isActive = activeParamsTab === tab;
                const label = tab === 'primary' 
                  ? (lang === 'vi' ? 'API Chính (Primary)' : 'Primary API') 
                  : (lang === 'vi' ? 'API Phụ (Secondary)' : 'Secondary API');
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveParamsTab(tab)}
                    className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wider text-center border-b-2 transition-all cursor-pointer ${
                      isActive 
                        ? 'border-indigo-500 text-indigo-500 bg-indigo-500/5' 
                        : 'border-transparent text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Content Form */}
            <div className="p-5 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
              {/* Temperature */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-xs font-medium">
                  <span className={`${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Temperature</span>
                  <span className="font-bold text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded text-[10px]">
                    {aiParams[activeParamsTab].temperature}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={aiParams[activeParamsTab].temperature}
                  onChange={e => setAiParams(prev => ({
                    ...prev,
                    [activeParamsTab]: {
                      ...prev[activeParamsTab],
                      temperature: parseFloat(e.target.value)
                    }
                  }))}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>

              {/* Max Completion Tokens */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-xs font-medium">
                  <span className={`${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Max Completion Tokens</span>
                  <span className="font-bold text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded text-[10px]">
                    {aiParams[activeParamsTab].maxCompletionTokens}
                  </span>
                </div>
                <input
                  type="range"
                  min="256"
                  max="16384"
                  step="256"
                  value={aiParams[activeParamsTab].maxCompletionTokens}
                  onChange={e => setAiParams(prev => ({
                    ...prev,
                    [activeParamsTab]: {
                      ...prev[activeParamsTab],
                      maxCompletionTokens: parseInt(e.target.value)
                    }
                  }))}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>

              {/* Top_P */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-xs font-medium">
                  <span className={`${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Top P</span>
                  <span className="font-bold text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded text-[10px]">
                    {aiParams[activeParamsTab].topP}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={aiParams[activeParamsTab].topP}
                  onChange={e => setAiParams(prev => ({
                    ...prev,
                    [activeParamsTab]: {
                      ...prev[activeParamsTab],
                      topP: parseFloat(e.target.value)
                    }
                  }))}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>

              {/* Reasoning Effort (bảng sẵn của game) */}
              <div className="flex flex-col gap-2 border-t border-slate-500/10 pt-3">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                    {lang === 'vi' ? 'Mô hình suy nghĩ (Thinking Model)' : 'Thinking Model Settings'}
                  </span>
                  <span className={`text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                    {lang === 'vi' 
                      ? 'Thiết lập mức độ suy nghĩ (Reasoning Effort):' 
                      : 'Set the depth of thinking (Reasoning Effort):'}
                  </span>
                </div>

                <div className="flex gap-2 mt-1">
                  {['low', 'medium', 'high'].map(effort => {
                    const isSelected = aiParams[activeParamsTab].reasoningEffort === effort;
                    return (
                      <button
                        key={effort}
                        type="button"
                        onClick={() => setAiParams(prev => ({
                          ...prev,
                          [activeParamsTab]: {
                            ...prev[activeParamsTab],
                            reasoningEffort: effort
                          }
                        }))}
                        className={`flex-1 p-2 rounded-lg border text-xs font-bold uppercase transition-all tracking-wider cursor-pointer ${
                          isSelected 
                            ? 'bg-indigo-600 text-white border-indigo-500 shadow-md scale-[1.02]' 
                            : (theme === 'dark' 
                                ? 'bg-slate-900 border-slate-700 hover:bg-slate-800 text-slate-300' 
                                : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700')
                        }`}
                      >
                        {effort}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Advanced Controls: Stop Sequence & Stream & CanThink */}
              <div className="flex flex-col gap-3 border-t border-slate-500/10 pt-3">
                {activeParamsTab === 'primary' && (
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-slate-400">
                        CanThink
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {lang === 'vi' ? 'Ép AI phân tích nháp bằng thẻ <think> trước khi đáp' : 'Force AI to analyze using <think> tags before answering'}
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={aiParams.primary.CanThink || false}
                        onChange={e => setAiParams(prev => ({
                          ...prev,
                          primary: {
                            ...prev.primary,
                            CanThink: e.target.checked
                          }
                        }))}
                      />
                      <div className="w-9 h-5 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400">Streaming (SSE)</span>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={aiParams[activeParamsTab].stream}
                      onChange={e => setAiParams(prev => ({
                        ...prev,
                        [activeParamsTab]: {
                          ...prev[activeParamsTab],
                          stream: e.target.checked
                        }
                      }))}
                    />
                    <div className="w-9 h-5 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-slate-400">Stop Sequence</span>
                  <input
                    type="text"
                    placeholder={lang === 'vi' ? 'Không có (Mặc định)' : 'None (Default)'}
                    value={aiParams[activeParamsTab].stop || ''}
                    onChange={e => {
                      const val = e.target.value;
                      setAiParams(prev => ({
                        ...prev,
                        [activeParamsTab]: {
                          ...prev[activeParamsTab],
                          stop: val ? val : null
                        }
                      }));
                    }}
                    className={`text-xs p-2.5 rounded-lg border outline-none focus:ring-1 focus:border-indigo-500 focus:ring-indigo-500 transition-shadow ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200'}`}
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className={`p-4 border-t flex justify-end ${theme === 'dark' ? 'border-slate-700 bg-slate-800' : 'border-slate-100 bg-slate-50/50'}`}>
              <button
                onClick={() => setShowAiParams(false)}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
              >
                {lang === 'vi' ? 'Hoàn thành' : 'Done'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* System Instructions Modal */}
      {showSysInstructions && (() => {
        const previewPrimary = sysRules
          .filter(r => r.type === 'primary' || r.type === 'content')
          .map(r => r.content.trim())
          .filter(Boolean)
          .join('\n\n');

        const previewSecondary = sysRules
          .filter(r => r.type === 'secondary' || r.type === 'content')
          .map(r => r.content.trim())
          .filter(Boolean)
          .join('\n\n');

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className={`w-full max-w-4xl rounded-2xl shadow-xl flex flex-col overflow-hidden ${theme === 'dark' ? 'bg-slate-800 border border-slate-700 text-slate-100' : 'bg-white text-slate-800 border'}`}>
              <div className={`p-4 border-b flex items-center justify-between ${theme === 'dark' ? 'border-slate-700 bg-slate-800' : 'border-slate-100 bg-slate-50/50'}`}>
                <h2 className="font-semibold flex items-center gap-2 text-sm md:text-base">
                  <FileText className="w-5 h-5 text-indigo-500" />
                  {translations[lang].systemInstructionsTitle}
                </h2>
                <button onClick={() => setShowSysInstructions(false)} className={`p-1 rounded-md transition-colors ${theme === 'dark' ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}><X className="w-5 h-5" /></button>
              </div>

              <div className="p-5 flex flex-col gap-5 overflow-y-auto max-h-[75vh]">
                {/* Table of Instructions */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                      {lang === 'vi' ? 'Bảng quy tắc chỉ thị hệ thống' : 'System Guidelines Table'}
                    </h3>
                    <button
                      onClick={() => {
                        const newRule: InstructionRule = {
                          id: 'custom_' + Date.now(),
                          name: lang === 'vi' ? 'Quy tắc tùy chỉnh mới' : 'New Custom Rule',
                          type: 'primary',
                          content: ''
                        };
                        setSysRules([...sysRules, newRule]);
                      }}
                      className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{lang === 'vi' ? 'Thêm dòng' : 'Add Row'}</span>
                    </button>
                  </div>
                  
                  <div className={`border rounded-xl overflow-hidden ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
                    {sysRules.length === 0 ? (
                      <div className={`p-6 text-center text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                        {lang === 'vi' ? 'Không có quy tắc nào. Bấm "Thêm dòng" để tự soạn quy tắc mới!' : 'No rules. Click "Add Row" to compose your own rules!'}
                      </div>
                    ) : (
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className={`${theme === 'dark' ? 'bg-slate-900/50 text-slate-400 border-b border-slate-800' : 'bg-slate-50 text-slate-500 border-b border-slate-200'}`}>
                            <th className="p-3 font-semibold w-52">{lang === 'vi' ? 'Tên quy tắc' : 'Rule Name'}</th>
                            <th className="p-3 font-semibold w-36">{lang === 'vi' ? 'Loại' : 'Type'}</th>
                            <th className="p-3 font-semibold">{lang === 'vi' ? 'Nội dung nhắc nhở (Prompt)' : 'Prompt Content'}</th>
                            <th className="p-3 font-semibold w-16 text-center">{lang === 'vi' ? 'Xóa' : 'Action'}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                          {sysRules.map((rule, idx) => {
                            return (
                              <tr 
                                key={rule.id} 
                                className={`group transition-colors ${theme === 'dark' ? 'hover:bg-slate-900/25 bg-slate-800/20' : 'hover:bg-slate-50 bg-white'}`}
                              >
                                <td className="p-3 align-top">
                                  <input 
                                    type="text"
                                    value={rule.name}
                                    onChange={(e) => {
                                      const nextRules = [...sysRules];
                                      nextRules[idx].name = e.target.value;
                                      setSysRules(nextRules);
                                    }}
                                    placeholder={lang === 'vi' ? 'Tên quy tắc...' : 'Rule name...'}
                                    className={`w-full font-semibold text-[11px] p-1.5 rounded border focus:ring-1 focus:border-indigo-500 focus:ring-indigo-500 outline-none transition-shadow ${
                                      theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                                    }`}
                                  />
                                </td>
                                <td className="p-3 align-top">
                                  <select
                                    value={rule.type}
                                    onChange={(e) => {
                                      const nextRules = [...sysRules];
                                      nextRules[idx].type = e.target.value as 'primary' | 'secondary' | 'content';
                                      setSysRules(nextRules);
                                    }}
                                    className={`w-full p-1.5 rounded border text-[11px] focus:ring-1 focus:border-indigo-500 outline-none transition-shadow ${
                                      theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                                    }`}
                                  >
                                    <option value="primary">{lang === 'vi' ? 'Api Chính' : 'Api Chính'}</option>
                                    <option value="secondary">{lang === 'vi' ? 'Api phụ' : 'Api phụ'}</option>
                                    <option value="content">Content</option>
                                  </select>
                                </td>
                                <td className="p-3 align-top">
                                  <textarea
                                    value={rule.content}
                                    onChange={(e) => {
                                      const nextRules = [...sysRules];
                                      nextRules[idx].content = e.target.value;
                                      setSysRules(nextRules);
                                    }}
                                    rows={2}
                                    placeholder={lang === 'vi' ? 'Nhập nội dung nhắc nhở...' : 'Enter prompt content...'}
                                    className={`w-full text-[11px] p-2 rounded-lg border outline-none font-mono resize-y leading-normal focus:ring-1 focus:border-indigo-500 focus:ring-indigo-500 transition-all ${
                                      theme === 'dark'
                                        ? 'bg-slate-900 border-slate-750 text-slate-300'
                                        : 'bg-slate-50 border-slate-200 text-slate-600'
                                    }`}
                                  />
                                </td>
                                <td className="p-3 text-center align-top">
                                  <button
                                    onClick={() => {
                                      const nextRules = sysRules.filter((_, rIdx) => rIdx !== idx);
                                      setSysRules(nextRules);
                                    }}
                                    className="p-1.5 rounded hover:bg-red-500/10 text-red-400 hover:text-red-500 transition-colors cursor-pointer"
                                    title={lang === 'vi' ? 'Xóa' : 'Delete'}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

                {/* Combined Instructions Previews */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                        {lang === 'vi' ? 'API Chính (Code & Chat)' : 'Primary API (Code & Chat)'}
                      </label>
                      <span className="text-[10px] font-mono text-slate-400">
                        {previewPrimary.length} {lang === 'vi' ? 'ký tự' : 'chars'}
                      </span>
                    </div>
                    <textarea
                      value={previewPrimary}
                      readOnly
                      placeholder={lang === 'vi' ? '(Trống - Chưa cấu hình quy tắc Api Chính hoặc Content)' : '(Empty - No Primary API or Content rules defined)'}
                      rows={6}
                      className={`w-full text-[10px] p-3 rounded-lg border outline-none font-mono resize-none leading-normal ${
                        theme === 'dark' ? 'bg-slate-900/60 border-slate-700 text-indigo-300/90' : 'bg-slate-50/60 border-slate-200 text-indigo-900'
                      }`}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold uppercase tracking-wider text-teal-400">
                        {lang === 'vi' ? 'API Phụ (Theme & Layout)' : 'Secondary API (Theme)'}
                      </label>
                      <span className="text-[10px] font-mono text-slate-400">
                        {previewSecondary.length} {lang === 'vi' ? 'ký tự' : 'chars'}
                      </span>
                    </div>
                    <textarea
                      value={previewSecondary}
                      readOnly
                      placeholder={lang === 'vi' ? '(Trống - Chưa cấu hình quy tắc Api phụ hoặc Content)' : '(Empty - No Secondary API or Content rules defined)'}
                      rows={6}
                      className={`w-full text-[10px] p-3 rounded-lg border outline-none font-mono resize-none leading-normal ${
                        theme === 'dark' ? 'bg-slate-900/60 border-slate-700 text-teal-300/90' : 'bg-slate-50/60 border-slate-200 text-teal-900'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className={`p-4 border-t flex justify-between items-center ${theme === 'dark' ? 'border-slate-700 bg-slate-800' : 'border-slate-100 bg-slate-50/50'}`}>
                <button
                  onClick={() => {
                    const freshDefault = DEFAULT_RULES.map(r => ({ ...r }));
                    setSysRules(freshDefault);
                  }}
                  className={`px-3 py-2 border rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                    theme === 'dark' ? 'border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {translations[lang].resetInstructionsBtn}
                </button>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const projectId = currentProject.id;
                      updateProject({ 
                        systemInstruction: previewPrimary,
                        themePrompt: previewSecondary 
                      });
                      try {
                        localStorage.setItem(`sys_rules_by_project_${projectId}`, JSON.stringify(sysRules));
                        localStorage.setItem('global_sys_rules', JSON.stringify(sysRules));
                        localStorage.setItem('global_system_instruction', previewPrimary);
                        localStorage.setItem('global_theme_instruction', previewSecondary);
                      } catch (e) {
                        console.error(e);
                      }
                      setShowSysInstructions(false);
                      setCustomDialog({
                        type: 'alert',
                        message: translations[lang].saveInstructionsSuccess,
                        onConfirm: () => {}
                      });
                    }}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer shadow-sm active:scale-95 transition-transform"
                  >
                    {translations[lang].doneInstructionsBtn}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Changes Modal */}
      {showChangesModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className={`w-full max-w-4xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden ${theme === 'dark' ? 'bg-slate-900 border border-slate-800 text-slate-100' : 'bg-white text-slate-800 border'}`}>
            {/* Header */}
            <div className={`p-4 border-b flex items-center justify-between ${theme === 'dark' ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50'}`}>
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-emerald-500 animate-pulse" />
                <div>
                  <h2 className="font-semibold text-sm leading-tight md:text-base">Xem thay đổi phiên bản (Version Comparison)</h2>
                  <p className={`text-[11px] mt-0.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                    So sánh code ban đầu và code hiện tại được thêm (+ xanh lá) hoặc bớt (- đỏ).
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowChangesModal(false)} 
                className={`p-1.5 rounded-md transition-colors ${theme === 'dark' ? 'hover:bg-slate-800' : 'hover:bg-slate-200'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Diff content box */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-950 text-slate-150">
              <div className="rounded-lg overflow-hidden border border-slate-850 bg-slate-900/40">
                {(() => {
                  const rawDiffs = computeLineDiff(currentProject.previousCode || '', currentProject.code || '');
                  
                  if (rawDiffs.length === 0 || (rawDiffs.length === 1 && !rawDiffs[0].value)) {
                    return <div className="text-center p-6 text-slate-500 italic text-sm">Chưa phát hiện thay đổi dòng code nào.</div>;
                  }

                  // Contextual diff compacting algorithm
                  const diffs: { type: 'added' | 'removed' | 'unchanged' | 'skipped', value: string }[] = [];
                  const keep = new Array(rawDiffs.length).fill(false);
                  
                  for (let i = 0; i < rawDiffs.length; i++) {
                    if (rawDiffs[i].type !== 'unchanged') {
                      keep[i] = true;
                      for (let k = Math.max(0, i - 2); k < i; k++) {
                        keep[k] = true;
                      }
                      for (let k = i + 1; k <= Math.min(rawDiffs.length - 1, i + 2); k++) {
                        keep[k] = true;
                      }
                    }
                  }
                  
                  let skippedCount = 0;
                  for (let i = 0; i < rawDiffs.length; i++) {
                    if (keep[i]) {
                      if (skippedCount > 0) {
                        diffs.push({ 
                          type: 'skipped', 
                          value: `• • • ${lang === 'vi' ? `Ẩn ${skippedCount} dòng code trùng khớp` : `Hidden ${skippedCount} identical lines`} • • •`
                        });
                        skippedCount = 0;
                      }
                      diffs.push(rawDiffs[i]);
                    } else {
                      skippedCount++;
                    }
                  }
                  if (skippedCount > 0) {
                    diffs.push({ 
                      type: 'skipped', 
                      value: `• • • ${lang === 'vi' ? `Ẩn ${skippedCount} dòng code trùng khớp` : `Hidden ${skippedCount} identical lines`} • • •`
                    });
                  }
                  
                  return (
                    <div className="flex flex-col font-mono text-xs divide-y divide-slate-800/20">
                      {diffs.map((diff, index) => {
                        let rowBg = "text-slate-400 hover:bg-white/5";
                        let prefix = "  ";
                        if (diff.type === 'added') {
                          rowBg = "bg-emerald-950/25 text-emerald-400 border-l-2 border-emerald-500 font-medium hover:bg-emerald-950/40";
                          prefix = "+ ";
                        } else if (diff.type === 'removed') {
                          rowBg = "bg-rose-950/25 text-rose-400 border-l-2 border-rose-500 line-through opacity-75 hover:bg-rose-950/45";
                          prefix = "- ";
                        } else if (diff.type === 'skipped') {
                          return (
                            <div key={index} className="py-2.5 px-4 text-center text-[10px] text-slate-500 select-none bg-slate-950/40 font-semibold tracking-wider italic">
                              {diff.value}
                            </div>
                          );
                        }
                        
                        return (
                          <div key={index} className={`flex py-1 px-4 leading-relaxed whitespace-pre-wrap break-all ${rowBg}`}>
                            <span className="w-6 select-none opacity-40 font-bold mr-2 text-right">{prefix}</span>
                            <span>{diff.value}</span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
            
            {/* Footer */}
            <div className={`p-3 border-t flex justify-end gap-2 ${theme === 'dark' ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50'}`}>
              <button 
                onClick={() => setShowChangesModal(false)}
                className={`px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-all shadow`}
              >
                Đồng ý (Done)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Project Mode Selection Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className={`w-full max-w-md rounded-2xl shadow-xl flex flex-col overflow-hidden border ${
            theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <div className={`p-4 border-b flex items-center justify-between ${theme === 'dark' ? 'border-slate-700 bg-slate-900/20' : 'border-slate-100 bg-slate-50'}`}>
              <h3 className="font-semibold text-base flex items-center gap-2">
                <Code2 className="w-5 h-5 text-indigo-500" />
                <span>{lang === 'vi' ? 'Tạo Dự án Mới' : 'Create New Project'}</span>
              </h3>
              <button 
                onClick={() => setShowCreateModal(false)}
                className={`p-1.5 rounded-md hover:bg-slate-500/10 transition-colors ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                  {lang === 'vi' ? 'Tên Dự án' : 'Project Name'}
                </label>
                <input 
                  type="text" 
                  value={newProjName}
                  onChange={(e) => setNewProjName(e.target.value)}
                  className={`text-sm p-2.5 rounded-lg border outline-none focus:ring-1 focus:border-indigo-500 focus:ring-indigo-500 transition-shadow ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200'
                  }`}
                  placeholder={lang === 'vi' ? 'Nhập tên game của bạn...' : 'Enter your game name...'}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                  {lang === 'vi' ? 'Chế độ Dự án' : 'Project Mode'}
                </label>
                
                <div className="grid grid-cols-2 gap-3 mt-1">
                  <div 
                    onClick={() => setNewProjMode('quick')}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col gap-1.5 ${
                      newProjMode === 'quick'
                        ? 'border-indigo-500 bg-indigo-500/5 ring-1 ring-indigo-500/30'
                        : (theme === 'dark' ? 'border-slate-700 bg-slate-900/20 hover:border-slate-600' : 'border-slate-200 bg-slate-50 hover:border-slate-300')
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Code className={`w-4 h-4 ${newProjMode === 'quick' ? 'text-indigo-500 font-bold' : 'text-slate-400'}`} />
                      <span className="text-xs font-bold">{lang === 'vi' ? 'HTML nhanh' : 'Quick HTML'}</span>
                    </div>
                    <p className={`text-[10px] leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                      {lang === 'vi' 
                        ? 'Tất cả mã nguồn game được gộp chung trong một file index.html duy nhất. Đơn giản, trực quan.' 
                        : 'All code compiled inside one single index.html file. Simple, intuitive.'}
                    </p>
                  </div>

                  <div 
                    onClick={() => setNewProjMode('full')}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col gap-1.5 ${
                      newProjMode === 'full'
                        ? 'border-indigo-500 bg-indigo-500/5 ring-1 ring-indigo-500/30'
                        : (theme === 'dark' ? 'border-slate-700 bg-slate-900/20 hover:border-slate-600' : 'border-slate-200 bg-slate-50 hover:border-slate-300')
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Folder className={`w-4 h-4 ${newProjMode === 'full' ? 'text-indigo-500 font-bold' : 'text-slate-400'}`} />
                      <span className="text-xs font-bold">{lang === 'vi' ? 'Bản đầy đủ (VFS)' : 'Full (VFS)'}</span>
                    </div>
                    <p className={`text-[10px] leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                      {lang === 'vi' 
                        ? 'Hỗ trợ đa cấu trúc thư mục, nhiều file (html, css, js). AI tự động quản lý virtual file system.' 
                        : 'Multi-file and multi-directory structures (html, css, js). AI handles virtual file system tags.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className={`p-4 border-t flex justify-end gap-2 ${theme === 'dark' ? 'border-slate-700 bg-slate-900/10' : 'border-slate-100 bg-slate-50'}`}>
              <button 
                onClick={() => setShowCreateModal(false)}
                className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
                  theme === 'dark' ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-600'
                }`}
              >
                {translations[lang].cancel}
              </button>
              <button 
                onClick={handleConfirmCreateProject}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold uppercase tracking-wider transition-all shadow"
              >
                {lang === 'vi' ? 'Tạo ngay' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
      {customDialog && (
        <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4">
          <div className={`w-full max-w-sm rounded-xl shadow-2xl overflow-hidden ${theme === 'dark' ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200'}`}>
            <div className={`p-4 border-b flex items-center gap-2 ${theme === 'dark' ? 'border-slate-700' : 'border-slate-100'}`}>
              <AlertCircle className={`w-5 h-5 ${customDialog.type === 'alert' ? 'text-orange-500' : 'text-indigo-500'}`} />
              <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                {customDialog.type === 'alert' ? 'Thông báo' : customDialog.type === 'confirm' ? 'Xác nhận' : 'Nhập liệu'}
              </h3>
            </div>
            
            <div className={`p-5 text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
              {customDialog.message}
              {customDialog.type === 'prompt' && (
                <>
                  <input
                    type="text"
                    autoFocus
                    defaultValue={customDialog.defaultValue || ''}
                    className={`mt-3 w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-indigo-500 outline-none transition-all ${
                      theme === 'dark' 
                        ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500' 
                        : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                    }`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        customDialog.onConfirm(e.currentTarget.value);
                        setCustomDialog(null);
                      } else if (e.key === 'Escape') {
                        if (customDialog.onCancel) customDialog.onCancel();
                        setCustomDialog(null);
                      }
                    }}
                    id="custom-prompt-input"
                  />
                  {customDialog.showFileUpload && (
                    <div className="mt-3 flex flex-col gap-1.5">
                      <div className="text-[10px] text-slate-500 flex items-center gap-1">
                        <span>{lang === 'vi' ? 'Hoặc chọn một file từ máy tính của bạn:' : 'Or choose a file from your computer:'}</span>
                      </div>
                      <input
                        type="file"
                        id="dialog-file-upload-input"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          
                          const isBinary = /\.(png|jpe?g|gif|webp|svg|mp3|wav|ogg|ico)$/i.test(file.name);
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            const content = event.target?.result as string;
                            const inputEl = document.getElementById('custom-prompt-input') as HTMLInputElement;
                            if (inputEl) {
                              inputEl.value = file.name;
                            }
                            (window as any)._dialogUploadedContent = content;
                            (window as any)._dialogUploadedName = file.name;
                          };
                          if (isBinary) {
                            reader.readAsDataURL(file);
                          } else {
                            reader.readAsText(file);
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => document.getElementById('dialog-file-upload-input')?.click()}
                        className={`py-2 px-3 border rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                          theme === 'dark'
                            ? 'bg-slate-700 hover:bg-slate-650 border-slate-600 text-slate-200 hover:text-white'
                            : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:text-indigo-600'
                        }`}
                      >
                        <Folder className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
                        {lang === 'vi' ? 'Nạp file từ máy' : 'Upload file from machine'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className={`p-4 flex gap-3 justify-end bg-black/5`}>
              {customDialog.type !== 'alert' && (
                <button
                  onClick={() => {
                    if (customDialog.onCancel) customDialog.onCancel();
                    setCustomDialog(null);
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    theme === 'dark' ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  {lang === 'vi' ? 'Hủy' : 'Cancel'}
                </button>
              )}
              <button
                onClick={() => {
                  let val = undefined;
                  if (customDialog.type === 'prompt') {
                    const input = document.getElementById('custom-prompt-input') as HTMLInputElement;
                    val = input?.value || '';
                  }
                  customDialog.onConfirm(val);
                  setCustomDialog(null);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors ${
                  customDialog.type === 'alert' 
                    ? 'bg-orange-500 hover:bg-orange-600' 
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {lang === 'vi' ? 'Đồng ý' : 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Context Menu */}
      {contextMenu && (
        <>
          <div 
            className="fixed inset-0 z-40 bg-transparent" 
            onClick={() => setContextMenu(null)}
            onContextMenu={(e) => {
              e.preventDefault();
              setContextMenu(null);
            }}
          />
          <div
            style={{ top: contextMenu.y, left: contextMenu.x }}
            className={`fixed z-50 min-w-48 rounded-xl border p-1.5 shadow-xl backdrop-blur-md transition-all animate-in fade-in-50 zoom-in-95 ${
              theme === 'dark'
                ? 'bg-slate-900/95 border-slate-800 text-slate-200'
                : 'bg-white/95 border-slate-200 text-slate-700'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider border-b mb-1 truncate max-w-[180px] ${theme === 'dark' ? 'text-slate-400 border-slate-800/60' : 'text-slate-500 border-slate-100'}`}>
              {contextMenu.nodePath.split('/').pop()}
            </div>
            
            <button
              onClick={() => {
                setContextMenu(null);
                renameFileOrFolder(contextMenu.nodePath, contextMenu.isFolder);
              }}
              className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg hover:bg-indigo-500 hover:text-white transition-colors flex items-center gap-2 cursor-pointer"
            >
              <PenTool className="w-3.5 h-3.5" />
              {lang === 'vi' ? 'Đổi tên' : 'Rename'}
            </button>

            <button
              onClick={() => {
                setContextMenu(null);
                handleSelectOption(contextMenu.nodePath);
              }}
              className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg hover:bg-indigo-500 hover:text-white transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              {lang === 'vi' ? 'Chọn nhiều' : 'Select multiple'}
            </button>

            <button
              onClick={() => {
                setContextMenu(null);
                setMoveTargetPaths([contextMenu.nodePath]);
                setTargetFolderSelection('');
                setNewFolderNameInput('');
              }}
              className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg hover:bg-indigo-500 hover:text-white transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Folder className="w-3.5 h-3.5" />
              {lang === 'vi' ? 'Cho vào thư mục' : 'Move to folder'}
            </button>

            {contextMenu.isFolder && (
              <button
                onClick={() => {
                  setContextMenu(null);
                  extractFolder(contextMenu.nodePath);
                }}
                className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg hover:bg-emerald-600 hover:text-white transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Undo2 className="w-3.5 h-3.5" />
                {lang === 'vi' ? 'Giải nén ra' : 'Extract folder'}
              </button>
            )}

            <button
              onClick={() => {
                setContextMenu(null);
                if (contextMenu.isFolder) {
                  downloadPathsAsZip([contextMenu.nodePath], contextMenu.nodePath.split('/').pop() || 'folder');
                } else {
                  const files = currentProject.files || {};
                  downloadFile(contextMenu.nodePath, files[contextMenu.nodePath] || '');
                }
              }}
              className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg hover:bg-indigo-500 hover:text-white transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              {lang === 'vi' ? 'Tải về' : 'Download'}
            </button>
          </div>
        </>
      )}

      {/* Move Target Paths Modal */}
      {moveTargetPaths && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`w-full max-w-sm rounded-2xl shadow-2xl p-6 border animate-in zoom-in-95 duration-200 ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <h3 className="text-sm font-bold mb-2 flex items-center gap-2">
              <Folder className="w-4.5 h-4.5 text-indigo-500" />
              {lang === 'vi' ? 'Di chuyển vào thư mục' : 'Move to folder'}
            </h3>
            <p className={`text-[11px] mb-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
              {lang === 'vi' 
                ? `Đang chọn di chuyển ${moveTargetPaths.length} mục:` 
                : `Moving ${moveTargetPaths.length} items:`}
              <span className="font-mono block mt-1 bg-slate-500/10 p-1.5 rounded truncate max-w-full text-[10px]">
                {moveTargetPaths.map(p => p.split('/').pop()).join(', ')}
              </span>
            </p>

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-[11px] font-semibold mb-1 block">
                  {lang === 'vi' ? 'Chọn thư mục đích:' : 'Select target folder:'}
                </label>
                <select
                  value={targetFolderSelection}
                  onChange={(e) => setTargetFolderSelection(e.target.value)}
                  className={`w-full px-2.5 py-1.5 rounded-lg border text-xs focus:ring-1 focus:ring-indigo-500 outline-none ${
                    theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <option value="">{lang === 'vi' ? '(Thư mục gốc / Root)' : '(Root folder)'}</option>
                  {getExistingFolders().map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                  <option value="__new_folder__">{lang === 'vi' ? '(Tạo thư mục mới...)' : '(Create new folder...)'}</option>
                </select>
              </div>

              {targetFolderSelection === '__new_folder__' && (
                <div className="animate-in slide-in-from-top-2 duration-150">
                  <label className="text-[10px] font-semibold mb-1 block text-indigo-400">
                    {lang === 'vi' ? 'Đường dẫn thư mục mới (ví dụ: assets/js):' : 'New folder path (e.g., assets/js):'}
                  </label>
                  <input
                    type="text"
                    placeholder={lang === 'vi' ? 'Nhập tên thư mục mới...' : 'Enter new folder path...'}
                    value={newFolderNameInput}
                    onChange={(e) => setNewFolderNameInput(e.target.value)}
                    className={`w-full px-2.5 py-1.5 rounded-lg border text-xs focus:ring-1 focus:ring-indigo-500 outline-none ${
                      theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setMoveTargetPaths(null)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  theme === 'dark' ? 'bg-slate-800 hover:bg-slate-750 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {lang === 'vi' ? 'Hủy bỏ' : 'Cancel'}
              </button>
              <button
                onClick={() => {
                  const dest = targetFolderSelection === '__new_folder__' ? newFolderNameInput : targetFolderSelection;
                  moveMultiplePaths(moveTargetPaths, dest);
                  setMoveTargetPaths(null);
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer"
              >
                {lang === 'vi' ? 'Xác nhận' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Terminal File Input for backup import */}
      <input 
        type="file"
        ref={terminalFileInputRef}
        accept=".msh,application/json"
        className="hidden"
        onChange={handleTerminalImportFile}
      />

      {/* TMUX TERMINAL MODAL */}
      {showTerminalModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono select-none animate-fade-in">
          <div className="w-full max-w-3xl h-[85vh] bg-black border border-zinc-900 rounded-xl overflow-hidden shadow-2xl flex flex-col text-white">
            {/* Tmux styled Title Bar */}
            <div className="bg-black px-4 py-2 border-b border-zinc-900 flex justify-between items-center text-xs text-zinc-300">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white flex items-center gap-1">
                  [tmux] 0: bash (AI Studio) - guest@tmux
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => {
                    setTerminalHistory([]);
                  }}
                  className="hover:text-white text-zinc-400 transition-colors cursor-pointer"
                  title="Clear logs"
                >
                  [clear]
                </button>
                <button 
                  onClick={() => setShowTerminalModal(false)}
                  className="hover:text-red-400 text-zinc-400 font-bold transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Quick Action Commands Drawer */}
            <div className="bg-black p-2.5 border-b border-zinc-900 flex flex-wrap gap-2 text-xs items-center">
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mr-1">Quick Commands:</span>
              <button 
                onClick={() => {
                  setTerminalHistory(prev => [...prev, { text: "guest@tmux:~$ open_library_python", type: "input" }]);
                  setShowLibraryManager(true);
                }}
                className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 hover:text-green-400 border border-zinc-700/60 rounded text-[11px] font-medium transition-all cursor-pointer"
              >
                open_library_python
              </button>
              <button 
                onClick={() => {
                  setTerminalHistory(prev => [
                    ...prev,
                    { text: "guest@tmux:~$ help", type: "input" },
                    { text: 'Available commands:', type: 'output' },
                    { text: '  open_library_python  - Open Python Library Manager', type: 'output' },
                    { text: '  help                 - Display this help message', type: 'output' },
                    { text: '  clear                - Clear terminal logs screen', type: 'output' },
                    { text: '  exit                 - Close terminal console', type: 'output' },
                    { text: '  reset_all_data       - Wipe out all saved data completely', type: 'output' },
                    { text: '  import_data          - Import local backup data from machine', type: 'output' },
                    { text: '  export_data          - Export data and custom presets to data.msh', type: 'output' }
                  ]);
                }}
                className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 hover:text-indigo-400 border border-zinc-700/60 rounded text-[11px] font-medium transition-all cursor-pointer"
              >
                help
              </button>
              <button 
                onClick={() => {
                  setTerminalHistory([]);
                }}
                className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 hover:text-zinc-100 border border-zinc-700/60 rounded text-[11px] font-medium transition-all cursor-pointer"
              >
                clear
              </button>
              <button 
                onClick={() => {
                  if (terminalFileInputRef.current) {
                    terminalFileInputRef.current.click();
                  }
                }}
                className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 hover:text-yellow-400 border border-zinc-700/60 rounded text-[11px] font-medium transition-all cursor-pointer"
              >
                import_data
              </button>
              <button 
                onClick={() => {
                  try {
                    const payload = {
                      projects,
                      providers,
                      customModelsList,
                      secondaryModel,
                      aiParams,
                      downloadedLibraries,
                      timestamp: Date.now()
                    };
                    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'data.msh';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    setTerminalHistory(prev => [
                      ...prev,
                      { text: "guest@tmux:~$ export_data", type: "input" },
                      { text: 'Exported backup to "data.msh" successfully!', type: 'success' }
                    ]);
                  } catch (e) {
                    setTerminalHistory(prev => [...prev, { text: `Export failed: ${e}`, type: 'error' }]);
                  }
                }}
                className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 hover:text-blue-400 border border-zinc-700/60 rounded text-[11px] font-medium transition-all cursor-pointer"
              >
                export_data
              </button>
              <button 
                onClick={() => {
                  if (resetConfirmationState) {
                    try {
                      localStorage.removeItem('ai_studio_projects');
                      localStorage.removeItem('custom_providers');
                      localStorage.removeItem('custom_models_list_v2');
                      localStorage.removeItem('custom_models_list');
                      localStorage.removeItem('secondary_model');
                      localStorage.removeItem('ai_params_config');
                      localStorage.removeItem('python_libraries');
                      localStorage.removeItem('global_sys_rules');
                      localStorage.removeItem('global_custom_model');
                      localStorage.removeItem('global_system_instruction');
                      localStorage.removeItem('global_theme_instruction');
                      localStorage.removeItem('global_additional_system_instruction');
                      
                      for (let i = localStorage.length - 1; i >= 0; i--) {
                        const key = localStorage.key(i);
                        if (key && key.startsWith('sys_rules_by_project_')) {
                          localStorage.removeItem(key);
                        }
                      }

                      const freshId = generateId();
                      const freshProject = {
                        ...defaultProject,
                        id: freshId,
                        systemInstruction: getGlobalSystemInstruction(),
                        themePrompt: getGlobalThemeInstruction(),
                        additionalSystemInstruction: getGlobalAdditionalSystemInstruction(),
                        customModel: getGlobalCustomModel(),
                        lastUsedAt: Date.now()
                      };
                      setProjects([freshProject]);
                      setCurrentId(freshId);

                      setProviders([
                        { id: 'gemini', name: 'Gemini (Default)', baseUrl: 'https://generativelanguage.googleapis.com', apiKey: '' }
                      ]);

                      setCustomModelsList([
                        { name: 'gemini-2.5-pro', providerId: 'gemini' },
                        { name: 'gemini-3.5-flash', providerId: 'gemini' },
                        { name: 'gemini-2.5-flash', providerId: 'gemini' },
                        { name: 'gemini-3.1-flash-lite', providerId: 'gemini' },
                        { name: 'gemini-3-flash-preview', providerId: 'gemini' },
                        { name: 'gemini-2.5-flash-lite', providerId: 'gemini' }
                      ]);

                      setSecondaryModel(null);
                      setDownloadedLibraries([]);
                      setAiParams({
                        primary: {
                          maxCompletionTokens: 8192,
                          temperature: 1.0,
                          topP: 1.0,
                          reasoningEffort: 'medium',
                          stream: true,
                          stop: null,
                          CanThink: false
                        },
                        secondary: {
                          maxCompletionTokens: 8192,
                          temperature: 1.0,
                          topP: 1.0,
                          reasoningEffort: 'medium',
                          stream: true,
                          stop: null
                        }
                      });

                      setResetConfirmationState(false);
                      setTerminalHistory(prev => [
                        ...prev,
                        { text: "guest@tmux:~$ reset_all_data", type: "input" },
                        { text: 'ALL SAVED DATA HAS BEEN WIPED OUT SUCCESSFULLY! REBOOT COMPLETE.', type: 'success' }
                      ]);
                    } catch (e) {
                      setTerminalHistory(prev => [...prev, { text: `Error during reset: ${e}`, type: 'error' }]);
                    }
                  } else {
                    setResetConfirmationState(true);
                    setTerminalHistory(prev => [
                      ...prev,
                      { text: "guest@tmux:~$ reset_all_data", type: "input" },
                      { text: 'WARNING: This action will permanently delete all projects, keys, custom models, system instructions and libraries.', type: 'error' },
                      { text: "Are you sure? Click 'reset_all_data' again to confirm and wipe.", type: 'error' }
                    ]);
                  }
                }}
                className={`px-2 py-1 border rounded text-[11px] font-medium transition-all cursor-pointer ${
                  resetConfirmationState 
                    ? 'bg-red-950 hover:bg-red-900 border-red-500 text-red-400 animate-pulse' 
                    : 'bg-zinc-800 hover:bg-zinc-700 hover:text-red-400 border-zinc-700/60'
                }`}
              >
                {resetConfirmationState ? 'CONFIRM RESET' : 'reset_all_data'}
              </button>
            </div>

            {/* View Switching */}
            <div className="flex-1 overflow-hidden relative flex flex-col">
              {showLibraryManager ? (
                /* TUI PYTHON PACKAGE MANAGER VIEW */
                <div className="absolute inset-0 bg-black flex flex-col p-4 animate-in fade-in duration-200">
                  {/* TUI Title bar */}
                  <div className="flex items-center justify-between border-b border-zinc-900 pb-2 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-bold">●</span>
                      <span className="font-bold text-sm tracking-wide text-white uppercase">Python Package Manager</span>
                    </div>
                    <button 
                      onClick={() => setShowLibraryManager(false)}
                      className="px-2.5 py-1 bg-black hover:bg-zinc-900 hover:text-white border border-zinc-800 rounded text-xs transition-colors cursor-pointer"
                    >
                      [← Back to CLI]
                    </button>
                  </div>

                  {/* Disk Capacity Progress Indicator */}
                  <div className="bg-black border border-zinc-900 p-3 rounded-lg mb-4 text-xs">
                    <div className="flex justify-between items-center mb-1.5 font-semibold">
                      <span>Total Disk Capacity:</span>
                      <span className={getDownloadedLibrariesSize() >= 180 ? 'text-red-400' : 'text-white'}>
                        {getDownloadedLibrariesSize()} MB / 200 MB ({Math.round((getDownloadedLibrariesSize() / 200) * 100)}%)
                      </span>
                    </div>
                    <div className="w-full bg-black border border-zinc-900 rounded-full h-3 overflow-hidden p-[2px]">
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${
                          getDownloadedLibrariesSize() >= 180 
                            ? 'bg-red-500' 
                            : getDownloadedLibrariesSize() >= 130 
                              ? 'bg-zinc-500' 
                              : 'bg-white'
                        }`}
                        style={{ width: `${Math.min(100, (getDownloadedLibrariesSize() / 200) * 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Search Bar prefix input */}
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-zinc-400 text-xs font-bold">Filter by prefix:</span>
                    <div className="flex-1 relative">
                      <input 
                        type="text"
                        placeholder="Search library names..."
                        value={librarySearchQuery}
                        onChange={(e) => setLibrarySearchQuery(e.target.value)}
                        className="w-full bg-black border border-zinc-900 rounded px-3 py-1.5 text-xs text-white placeholder-zinc-700 focus:outline-none focus:border-white transition-colors"
                        autoFocus
                      />
                      {librarySearchQuery && (
                        <button 
                          onClick={() => setLibrarySearchQuery('')}
                          className="absolute right-2.5 top-1.5 text-zinc-500 hover:text-zinc-300 transition-colors text-xs cursor-pointer"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Scrollable list of python packages */}
                  <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2.5 scrollbar-thin scrollbar-thumb-zinc-900">
                    {PYTHON_LIBRARIES_DB.filter(lib => lib.name.toLowerCase().startsWith(librarySearchQuery.toLowerCase())).length === 0 ? (
                      <div className="text-center py-10 text-zinc-600 text-xs font-medium">
                        No python libraries found matching prefix "{librarySearchQuery}"
                      </div>
                    ) : (
                      PYTHON_LIBRARIES_DB.filter(lib => lib.name.toLowerCase().startsWith(librarySearchQuery.toLowerCase())).map(lib => {
                        const isDownloaded = downloadedLibraries.includes(lib.name);
                        return (
                          <div 
                            key={lib.name}
                            className={`p-3 border rounded-lg flex justify-between items-start transition-all gap-4 ${
                              isDownloaded 
                                ? 'bg-black border-green-900/60 text-white' 
                                : 'bg-black border-zinc-900 text-zinc-300'
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                <span className="font-bold text-sm text-white">{lib.name}</span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-black border border-zinc-900 text-zinc-400 font-bold">
                                  {lib.size} MB
                                </span>
                                {lib.category && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-black border border-zinc-900 text-zinc-500 font-medium">
                                    {lib.category}
                                  </span>
                                )}
                                {isDownloaded && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-950/40 border border-green-900 text-green-400 font-bold">
                                    INSTALLED
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-zinc-350 leading-relaxed font-sans mt-1">
                                {lib.desc}
                              </p>
                            </div>
                            <button
                              onClick={() => handleToggleLibraryDownload(lib.name)}
                              className={`flex-shrink-0 text-xs px-3 py-1.5 rounded font-bold border transition-all cursor-pointer ${
                                isDownloaded
                                  ? 'bg-black hover:bg-red-950 hover:text-red-400 text-red-500 border-red-900/50'
                                  : 'bg-black hover:bg-zinc-900 hover:text-white border-zinc-800 hover:border-zinc-700'
                              }`}
                            >
                              {isDownloaded ? 'UNINSTALL' : 'INSTALL'}
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              ) : (
                /* CLI CONSOLE LOG SCREEN VIEW */
                <div className="absolute inset-0 flex flex-col p-4 font-mono select-text bg-black">
                  {/* Console logs container */}
                  <div className="flex-1 overflow-y-auto mb-4 space-y-1.5 pr-1 text-xs scrollbar-thin scrollbar-thumb-zinc-900">
                    {terminalHistory.map((log, index) => {
                      let colorClass = "text-white";
                      if (log.type === 'input') colorClass = "text-white font-bold";
                      else if (log.type === 'success') colorClass = "text-green-400 font-bold";
                      else if (log.type === 'error') colorClass = "text-red-400 font-medium";

                      return (
                        <div key={index} className={`whitespace-pre-wrap leading-relaxed ${colorClass}`}>
                          {log.text}
                        </div>
                      );
                    })}
                    <div ref={terminalLogsEndRef} />
                  </div>

                  {/* Shell Input Form */}
                  <form onSubmit={handleTerminalSubmit} className="flex items-start border-t border-zinc-900 pt-3">
                    <span className="text-white font-bold mr-2 select-none mt-0.5">guest@tmux:~$</span>
                    <textarea 
                      className="flex-1 bg-transparent text-white outline-none border-none text-xs resize-none min-h-[40px] focus:ring-0 focus:outline-none"
                      placeholder="Type commands, paste code, or enter [!createnew file:path] followed by code..."
                      value={terminalInput}
                      onChange={(e) => setTerminalInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleTerminalSubmit(e);
                        }
                      }}
                      autoFocus
                      rows={2}
                    />
                  </form>
                </div>
              )}
            </div>

            {/* Tmux styled Green Status bar at bottom */}
            <div className="bg-black border-t border-zinc-900 px-4 py-1 flex justify-between items-center text-[11px] text-zinc-300 font-bold">
              <div className="flex items-center gap-3">
                <span className="bg-white text-black px-1 py-0.2 rounded text-[10px]">0</span>
                <span className="text-white">bash*</span>
                <span className="opacity-50">|</span>
                <span>"AI Studio"</span>
              </div>
              <div className="flex items-center gap-3">
                <span>disk: {getDownloadedLibrariesSize()}MB / 200MB</span>
                <span className="opacity-50">|</span>
                <span>{new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
