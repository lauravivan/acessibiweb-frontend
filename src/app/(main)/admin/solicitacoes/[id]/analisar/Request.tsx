"use client";

import Code from "@/components/Code";
import { useScreenType } from "@/hooks/useScreenType";
import { updateGuidelineStatus } from "@/routes/guidelines-requests";
import { Guideline } from "@/types/guideline";
import { type Page } from "@/types/page";
import imageKitLoader from "@/utils/image-kit-loader";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type RequestProps = Page & {
  request: Guideline;
};

export default function RequestAnalyze({ request }: RequestProps) {
  const [statusCode, setStatusCode] = useState("");
  const { isDesktop } = useScreenType();
  const router = useRouter();

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const statusMsg = formData.get("statusMsg")?.toString();
    const res = await updateGuidelineStatus(request.id, statusCode, statusMsg);

    if (res.ok) {
      if (isDesktop) {
        window.location.reload();
      } else {
        router.push("/admin/solicitacoes");
      }
    }
  };

  return (
    <div className="request-analyze">
      <div>
        <div className="request-analyze__discriminator">Autor(a)</div>
        <div className="request-analyze__data">{request.user.username}</div>
      </div>

      <div>
        <div className="request-analyze__discriminator">Diretriz</div>
        <div className="request-analyze__data">{request.name}</div>
      </div>

      <div>
        <div className="request-analyze__discriminator">Descrição</div>
        <div className="request-analyze__data">{request.description}</div>
      </div>

      <div>
        <div className="request-analyze__discriminator">Deficiências</div>
        <div>
          {request.deficiences?.map((def) => (
            <div key={def.id} className="request-analyze__data">
              {def.name}
            </div>
          ))}
        </div>
      </div>

      {(request.code || request.image) && (
        <div>
          <Code code={request.code} editable={false} />
          <Image
            loader={() => imageKitLoader(request.image!)}
            src={request.image!}
            alt={request.imageDesc!}
            width={600}
            height={1000}
          />
        </div>
      )}

      <form onSubmit={onSubmit}>
        <textarea
          name="statusMsg"
          id="statusMsg"
          rows={7}
          placeholder="Escreva aqui suas considerações que justificam a sua escolha..."
        />
        <div>
          <button type="submit" onClick={() => setStatusCode("APPROVED")}>
            Aprovar
          </button>
          <button type="submit" onClick={() => setStatusCode("REJECTED")}>
            Rejeitar
          </button>
        </div>
      </form>
    </div>
  );
}
