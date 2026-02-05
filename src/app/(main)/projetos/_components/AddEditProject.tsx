"use client";

import { useForm } from "react-hook-form";
import InputTextVoice from "@/components/InputTextVoice";
import { zodResolver } from "@hookform/resolvers/zod";
import { Breadcrumb } from "@/components/Breadcrumb";
import useErrors from "@/hooks/useErrors";
import Errors from "@/components/Errors";
import { Project } from "@/types/project";
import { type Page } from "@/types/page";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { useCart } from "@/context/cart";
import Link from "next/link";
import useSecPage from "@/hooks/useSecPage";
import SecondPage from "@/components/SecondPage";
import { useScreenType } from "@/hooks/useScreenType";
import { getGuideline } from "@/routes/guidelines";
import Guideline from "../../_components/Guideline";
import { createProject, editProject } from "@/routes/projects";
import { usePush } from "@/context/push";
import { useRouter } from "next/navigation";
import {
  CreateProjectSchema,
  createProjectSchema,
  EditProjectSchema,
  editProjectSchema,
} from "@/schemas/project.schema";
import { useSession } from "next-auth/react";
import { ApiError, FetchResponse, FetchUpdateResult } from "@/types/fetch";
import DeleteBtn from "@/components/card/Delete";
import { Guideline as GuidelineType } from "@/types/guideline";
import Card from "@/components/Card";
import useModal from "@/hooks/useModal";
import { createPortal } from "react-dom";
import GuidelinesPage from "@/app/(main)/_components/Guidelines";
import { IoCloseOutline } from "react-icons/io5";
import { SlTrash } from "react-icons/sl";

type AddEditProjectProps = Page & {
  project?: Project;
};

export default function AddEditProject({
  isSecPage = false,
  isEditPage = false,
  crumbs,
  project,
  handleSecPageTitle,
}: AddEditProjectProps) {
  const projName = useMemo(() => project?.name, [project?.name]);
  const projDesc = useMemo(() => project?.description, [project?.description]);
  const projGuides = useMemo(() => project?.guidelines, [project?.guidelines]);
  const projFeedback = useMemo(() => project?.feedback, [project?.feedback]);

  const {
    cart,
    removeGuidelineOfCart,
    addDescriptionToCart,
    addNameToCart,
    cleanCart,
  } = useCart();

  const {
    isOpen: isSecPageOpen,
    handleIsOpen: handleIsSecPageOpen,
    getSecPageClass,
    handleNode: handleSecPageContent,
    node: secPageContent,
    title: secPageTitle,
    handleTitle,
    fullScreenLink,
    handleFullScreenLink,
  } = useSecPage();

  const [guidelinesShown, setGuidelinesShown] = useState(false);

  const { isDesktop } = useScreenType();

  const { isModalOpen, showModal, modalRef, hideModal } = useModal();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
    getValues,
  } = useForm<EditProjectSchema | CreateProjectSchema>({
    resolver: zodResolver(isEditPage ? editProjectSchema : createProjectSchema),
    defaultValues: {
      projName: cart && !isEditPage ? cart.name : projName,
      desc: cart && !isEditPage ? cart.description : projDesc,
      guidelines: cart && !isEditPage ? cart.guidelines : projGuides,
      feedback: projFeedback || "",
    },
  });

  const { handleApiErrors, errorMsgs, isAlert } = useErrors();
  const { setPushMsg, setShowPush } = usePush();
  const router = useRouter();
  const projectName = watch("projName");
  const { data: session } = useSession();

  useEffect(() => {
    if (handleSecPageTitle) {
      handleSecPageTitle(
        isEditPage
          ? `Editar ${project?.name}`
          : projectName || "Cadastrar projeto"
      );
    }
  }, [projectName, handleSecPageTitle, isEditPage, project]);

  const handleSetValue = (name: string, value: string) => {
    if (name === "projName" || name === "desc") {
      setValue(name, value);
    }
  };

  const handleReadSecPage = async (id: string) => {
    const res = await getGuideline(id);

    if (res.ok && "data" in res) {
      handleIsSecPageOpen(true);
      handleSecPageContent(
        <Guideline guideline={res.data} isRequest={false} />
      );
      handleTitle(res.data.name);
      handleFullScreenLink(`/diretrizes/${id}`);
    }
  };

  const handleResponse = () => {
    setPushMsg(
      `Projeto ${isEditPage ? "editado" : "cadastrado"} com sucesso 🎉`
    );
    setShowPush(true);
    reset();

    if (isDesktop) {
      window.location.reload();
    } else {
      router.push("/projetos");
    }
  };

  const handleNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!isEditPage) {
      addNameToCart(e.target.value);
    }
  };

  const handleDescChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    if (!isEditPage) {
      addDescriptionToCart(e.target.value);
    }
  };

  const onSubmit = async (data: CreateProjectSchema | EditProjectSchema) => {
    let res: ApiError | (FetchResponse & Project) | FetchUpdateResult =
      {} as ApiError;

    if (isEditPage && "feedback" in data && project) {
      res = await editProject(project.id, {
        name: data.projName,
        desc: data.desc,
        guidelines: data.guidelines?.map((guide) => guide.id) || [],
        feedback: data.feedback || "",
      });
    }

    if (!isEditPage && session?.user.id) {
      res = await createProject({
        name: data.projName,
        desc: data.desc,
        guidelines: data.guidelines?.map((guide) => guide.id) || [],
      });
    }

    if (!res.ok && "errors" in res) {
      handleApiErrors(res);
      setPushMsg("");
      setShowPush(false);
    } else if (Object.keys(res).length === 0) {
      router.push("/auth/logar");
    } else {
      handleResponse();

      if (!isEditPage) {
        cleanCart();
      }
    }
  };

  const Guidelines = ({
    guides,
  }: {
    guides: { id: string; name: string }[] | GuidelineType[];
  }) => {
    return (
      <div className="grid" id="guidelines-grid">
        {guides.map((guide) => (
          <div className="grid__item" key={guide.id}>
            <Card
              mainText={guide.name}
              onClick={() => handleReadSecPage(guide.id)}
              onKeyDown={() => handleReadSecPage(guide.id)}
              isLink={!isDesktop}
              readRoute={`/diretrizes/${guide.id}`}
            >
              <button type="button" onClick={() => handleDelete(guide.id)}>
                <SlTrash
                  className="cursor-pointer"
                  aria-hidden={true}
                  focusable={false}
                />
              </button>
            </Card>
          </div>
        ))}
      </div>
    );
  };

  const handleAdd = (id: string, name: string) => {
    const guides = [...(getValues("guidelines") || [])];

    const guide = guides.find((g) => g.id === id);

    if (!guide) {
      guides.push({ id, name });
      setValue("guidelines", guides);
      setShowPush(true);
      setPushMsg("Diretriz incluída com sucesso");
    } else {
      setShowPush(true);
      setPushMsg("Essa diretriz já foi incluída");
    }
  };

  const handleDelete = (id: string) => {
    const guides = [...(getValues("guidelines") || [])];

    const newGuides = guides.filter((g) => g.id !== id);

    setValue("guidelines", newGuides);
  };

  return (
    <div className={getSecPageClass()}>
      <div
        className={`${isEditPage ? "edit-project edit-page" : "add-project"}`}
      >
        {!isSecPage && crumbs && <Breadcrumb crumbs={crumbs} />}
        {!isSecPage && (
          <h1
            className="heading-1"
            aria-live="polite"
            aria-relevant="additions text"
          >
            {isEditPage
              ? `Editar projeto ${project?.name}`
              : projectName || "Novo projeto"}
          </h1>
        )}
        <div className="toggle-guidelines">
          <button
            className="btn-default"
            onClick={() => setGuidelinesShown((prev) => !prev)}
            aria-pressed={guidelinesShown}
            id="toggle-guidelines"
            aria-controls="guidelines-grid"
          >
            {`${guidelinesShown ? "Ocultar" : "Mostrar"}`} diretrizes
            selecionadas
          </button>
          {isEditPage ? (
            <>
              <button
                type="button"
                aria-label="Incluir diretriz no projeto"
                onClick={showModal}
                aria-haspopup="dialog"
                aria-expanded={isModalOpen}
                aria-controls="guidelines-modal"
                className="btn-default cursor-pointer"
              >
                &#43;
              </button>
              {isModalOpen &&
                createPortal(
                  <dialog
                    className="modal"
                    ref={modalRef}
                    aria-label="Diretrizes de acessibilidade"
                    aria-modal={true}
                    id="guidelines-modal"
                  >
                    <button
                      style={{ position: "absolute" }}
                      className="btn-default"
                      onClick={hideModal}
                    >
                      <IoCloseOutline />
                    </button>
                    <GuidelinesPage
                      isAdmin={false}
                      isRequest={false}
                      handleAdd={handleAdd}
                    />
                  </dialog>,
                  document.getElementById("app")!
                )}
            </>
          ) : (
            <Link
              href="/diretrizes"
              className="btn-link-default"
              aria-label="Incluir diretrizes no carrinho (+)"
            >
              &#43;
            </Link>
          )}
        </div>
        <form className="form" method="POST" onSubmit={handleSubmit(onSubmit)}>
          <label htmlFor="projName" className="sr-only">
            Nome do projeto
          </label>
          <InputTextVoice
            useWatchName={"projName"}
            handleSetValue={handleSetValue}
            keycut="alt+shift+n"
          >
            <input
              {...register("projName")}
              placeholder="Nome do projeto, exemplo: Acessiweb"
              id="projName"
              name="projName"
              aria-invalid={errors.projName ? true : false}
              aria-keyshortcuts="alt+shift+n"
              aria-errormessage={
                errors.projName ? "invalid-project-name" : undefined
              }
              onChange={handleNameChange}
            />
          </InputTextVoice>
          {errors.projName && (
            <small
              role="status"
              id="invalid-project-name"
              className="form-error-msg"
            >
              {errors.projName.message}
            </small>
          )}
          <label htmlFor="desc" className="sr-only">
            Descrição do projeto
          </label>
          <InputTextVoice
            useWatchName={"desc"}
            handleSetValue={handleSetValue}
            keycut="alt+shift+d"
          >
            <textarea
              {...register("desc")}
              placeholder="Descrição do projeto, exemplo: esse sistema permitirá que os usuários cadastrem seus projetos e associem a eles as diretrizes mais relevantes para seu contexto. Assim, não se trata de uma ferramenta que implementa e avalia automaticamente a acessibilidade, mas de um meio estruturado para os usuários terem maior controle e visibilidade sobre os requisitos necessários para tornar seus projetos mais acessíveis."
              id="desc"
              name="desc"
              aria-invalid={errors.desc ? true : false}
              className="input-transparent"
              aria-errormessage={
                errors.desc ? "invalid-project-desc" : undefined
              }
              aria-keyshortcuts="alt+shift+d"
              rows={5}
              onChange={handleDescChange}
            />
          </InputTextVoice>
          {errors.desc && (
            <small
              role="status"
              id="invalid-project-desc"
              className="form-error-msg"
            >
              {errors.desc.message}
            </small>
          )}
          {guidelinesShown &&
            !isEditPage &&
            cart &&
            cart.guidelines.length > 0 && (
              <Guidelines guides={cart.guidelines} />
            )}
          {guidelinesShown && isEditPage && project && (
            <Guidelines
              guides={
                project.guidelines.length > 0
                  ? project.guidelines
                  : getValues("guidelines") || []
              }
            />
          )}
          {guidelinesShown && !isEditPage && cart?.guidelines.length === 0 && (
            <div>Ainda não foram selecionadas diretrizes para esse projeto</div>
          )}
          {guidelinesShown &&
            isEditPage &&
            getValues("guidelines")?.length === 0 && (
              <div>
                Ainda não foram selecionadas diretrizes para esse projeto
              </div>
            )}
          {errors.guidelines && (
            <small
              role="status"
              id="invalid-project-guidelines"
              className="form-error-msg"
            >
              {errors.guidelines.message}
            </small>
          )}
          {isEditPage && (
            <>
              <label htmlFor="feedback" className="sr-only">
                Feedback do projeto
              </label>
              <InputTextVoice
                useWatchName={"feedback"}
                handleSetValue={handleSetValue}
                keycut="alt+shift+f"
              >
                <textarea
                  {...register("feedback")}
                  placeholder="Feedback do projeto, exemplo: Após implementar as diretrizes selecionadas..."
                  id="feedback"
                  name="feedback"
                  aria-invalid={"feedback" in errors ? true : false}
                  aria-keyshortcuts="alt+shift+f"
                  aria-errormessage={
                    "feedback" in errors ? "invalid-project-name" : undefined
                  }
                  rows={7}
                />
              </InputTextVoice>
              {"feedback" in errors && (
                <small
                  role="status"
                  id="invalid-project-name"
                  className="form-error-msg"
                >
                  {errors.feedback?.message}
                </small>
              )}
            </>
          )}
          <Errors msgs={errorMsgs} isAlert={isAlert} />
          <div>
            <button type="submit" className="btn-default">
              {isEditPage ? "Editar" : "Criar"}
            </button>
          </div>
        </form>
      </div>
      {isSecPageOpen && isDesktop && (
        <SecondPage
          title={secPageTitle}
          onClick={() => handleIsSecPageOpen(false)}
          fullScreenLink={fullScreenLink}
        >
          {secPageContent}
        </SecondPage>
      )}
    </div>
  );
}
